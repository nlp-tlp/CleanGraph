"""Services for performing CRUD operation on entire graphs"""

from typing import List, Dict, Tuple, Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import traceback
from loguru import logger

from services.utils import flatten_nested_dict
from models import graph as graph_model
from models.misc import SettingUpdate


async def read_graphs(
    skip: int, limit: int, db: AsyncIOMotorDatabase
) -> List[graph_model.SimpleGraph]:
    """Retrieve a list of graphs from the database.

    Skips the first 'skip' records and limiting the result to 'limit' records.
    Only the id, creation time, update time, and name of the graphs are returned.
    """

    graphs = (
        await db["graphs"]
        .find({}, {"_id": 1, "created_at": 1, "updated_at": 1, "name": 1})
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return [graph_model.SimpleGraph(**g) for g in graphs]


async def get_subgraph_review_progress(graph_id: ObjectId, db: AsyncIOMotorDatabase):
    """Fetches the reviewed progress on graph subgraphs

    # TODO: OPTIMISE AND MAKE MORE EFFICIENT - SHOULD HAVE LIMIT ON SUBGRAPHS TO CHECK!
    """
    nodes = (
        await db["nodes"]
        .find(
            {"graph_id": graph_id},
            {
                "_id": 1,
                "value": 1,
                "errors": 1,
                "suggestions": 1,
                "is_reviewed": 1,
            },
        )
        .to_list(None)
    )
    edges = (
        await db["edges"]
        .find(
            {"graph_id": graph_id},
            {
                "_id": 1,
                "is_reviewed": 1,
            },
        )
        .to_list(None)
    )

    # 1. Create neighbours
    pipeline = [
        {"$match": {"graph_id": graph_id}},
        {
            "$facet": {
                "fromHead": [
                    {
                        "$group": {
                            "_id": "$head",
                            "nodes": {"$addToSet": "$tail"},
                            "links": {"$addToSet": "$edge"},
                        }
                    }
                ],
                "fromTail": [
                    {
                        "$group": {
                            "_id": "$tail",
                            "nodes": {"$addToSet": "$head"},
                            "links": {"$addToSet": "$edge"},
                        }
                    }
                ],
            }
        },
        {"$project": {"all": {"$concatArrays": ["$fromHead", "$fromTail"]}}},
        {"$unwind": "$all"},
        {
            "$group": {
                "_id": "$all._id",
                "nodes": {"$addToSet": "$all.nodes"},
                "links": {"$addToSet": "$all.links"},
            }
        },
        {
            "$project": {
                "_id": 1,
                "nodes": {
                    "$reduce": {
                        "input": "$nodes",
                        "initialValue": [],
                        "in": {"$setUnion": ["$$this", "$$value"]},
                    }
                },
                "links": {
                    "$reduce": {
                        "input": "$links",
                        "initialValue": [],
                        "in": {"$setUnion": ["$$this", "$$value"]},
                    }
                },
            }
        },
    ]

    neighbours = await db["triples"].aggregate(pipeline).to_list(None)
    # print("neighbours", neighbours)

    # 2. Get counts of errors on all nodes/edges
    node_counts = {
        n["_id"]: {
            "is_reviewed": n["is_reviewed"],
        }
        for n in nodes
    }
    edge_counts = {
        e["_id"]: {
            "is_reviewed": e["is_reviewed"],
        }
        for e in edges
    }

    reviewed_nodes = sum([n["is_reviewed"] for n in nodes])
    reviewed_edges = sum([e["is_reviewed"] for e in edges])

    # 3. Aggregate on neighbour keys
    subgraph_progress = {}
    for neigh in neighbours:
        node_id = neigh["_id"]

        _nodes = 1  # Starts from one as the central node isn't included in its own neighbours
        _edges = 0
        _nodes_reviewed = int(
            node_counts[node_id]["is_reviewed"]
        )  # Starts with the count of the central nodes "is_reviewed" state.
        _edges_reviewed = 0

        for n_id in neigh["nodes"]:
            _nodes_reviewed += int(node_counts[n_id]["is_reviewed"])
            _nodes += 1

        for e_id in neigh["links"]:
            _edges_reviewed += int(edge_counts[e_id]["is_reviewed"])
            _edges += 1

        subgraph_progress[str(node_id)] = {
            "node_count": _nodes,
            "edge_count": _edges,
            "nodes_reviewed": _nodes_reviewed,
            "edges_reviewed": _edges_reviewed,
            "reviewed_progress": round(
                (_nodes_reviewed + _edges_reviewed) / (_nodes + _edges) * 100
            )
            if _nodes + _edges > 0
            else 0,
        }

    return reviewed_nodes, reviewed_edges, subgraph_progress


async def read_graph(graph_id: ObjectId, db: AsyncIOMotorDatabase) -> graph_model.Graph:
    """
    Fetches the details of a single graph.

    TODO
    ----
    - Compute errors and suggestions for subgraphs and return them.
    - Make process more efficient
    """

    try:
        db_graph = await db["graphs"].find_one({"_id": graph_id})

        if db_graph is None:
            raise HTTPException(status_code=404, detail="Graph not found")

        nodes = (
            await db["nodes"]
            .find(
                {"graph_id": graph_id},
                {
                    "_id": 1,
                    "name": 1,
                    "type": 1,
                    "value": 1,
                    "errors": 1,
                    "suggestions": 1,
                    "is_reviewed": 1,
                },
            )
            .to_list(None)
        )
        node_id2detail = {n["_id"]: n for n in nodes}
        edges = (
            await db["edges"]
            .find(
                {"graph_id": graph_id},
                {
                    "_id": 1,
                    "name": 1,
                    "value": 1,
                    "errors": 1,
                    "suggestions": 1,
                    "is_reviewed": 1,
                },
            )
            .to_list(None)
        )

        # Get errors and suggestions on subgraphs centred on nodes...

        # 1. Create neighbours
        pipeline = [
            {"$match": {"graph_id": graph_id}},
            {
                "$facet": {
                    "fromHead": [
                        {
                            "$group": {
                                "_id": "$head",
                                "nodes": {"$addToSet": "$tail"},
                                "links": {"$addToSet": "$edge"},
                            }
                        }
                    ],
                    "fromTail": [
                        {
                            "$group": {
                                "_id": "$tail",
                                "nodes": {"$addToSet": "$head"},
                                "links": {"$addToSet": "$edge"},
                            }
                        }
                    ],
                }
            },
            {"$project": {"all": {"$concatArrays": ["$fromHead", "$fromTail"]}}},
            {"$unwind": "$all"},
            {
                "$group": {
                    "_id": "$all._id",
                    "nodes": {"$addToSet": "$all.nodes"},
                    "links": {"$addToSet": "$all.links"},
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "nodes": {
                        "$reduce": {
                            "input": "$nodes",
                            "initialValue": [],
                            "in": {"$setUnion": ["$$this", "$$value"]},
                        }
                    },
                    "links": {
                        "$reduce": {
                            "input": "$links",
                            "initialValue": [],
                            "in": {"$setUnion": ["$$this", "$$value"]},
                        }
                    },
                }
            },
        ]

        neighbours = await db["triples"].aggregate(pipeline).to_list(None)
        # print("neighbours", neighbours)

        # 2. Get counts of errors on all nodes/edges
        node_counts = {
            n["_id"]: {
                "errors": len(n["errors"]),
                "suggestions": len(n["suggestions"]),
                "is_reviewed": n["is_reviewed"],
            }
            for n in nodes
        }
        edge_counts = {
            e["_id"]: {
                "errors": len(e["errors"]),
                "suggestions": len(e["suggestions"]),
                "is_reviewed": e["is_reviewed"],
            }
            for e in edges
        }

        # print("node_counts", node_counts)
        # print("edge_counts", edge_counts)

        reviewed_nodes = sum([n["is_reviewed"] for n in nodes])
        reviewed_edges = sum([e["is_reviewed"] for e in edges])

        # print("reviewed_nodes", reviewed_nodes)
        # print("reviewed_edges", reviewed_edges)

        # 3. Aggregate errors on neighbour keys
        total_errors = 0
        total_suggestions = 0
        subgraphs = []
        for neigh in neighbours:
            node_id = neigh["_id"]

            _errors = 0
            _suggestions = 0
            _nodes = 1  # Starts from one as the central node isn't included in its own neighbours
            _edges = 0
            _nodes_reviewed = int(
                node_counts[node_id]["is_reviewed"]
            )  # Starts with the count of the central nodes "is_reviewed" state.
            _edges_reviewed = 0

            for n_id in neigh["nodes"]:
                _errors += node_counts[n_id]["errors"]
                _suggestions += node_counts[n_id]["suggestions"]

                _nodes_reviewed += int(node_counts[n_id]["is_reviewed"])
                _nodes += 1

            for e_id in neigh["links"]:
                _errors += edge_counts[e_id]["errors"]
                _suggestions += edge_counts[e_id]["suggestions"]

                _edges_reviewed += int(edge_counts[e_id]["is_reviewed"])
                _edges += 1

            subgraphs.append(
                graph_model.SubGraph(
                    _id=node_id,
                    name=node_id2detail[node_id]["name"],
                    value=node_id2detail[node_id]["value"],
                    errors=_errors,
                    node_count=_nodes,
                    edge_count=_edges,
                    nodes_reviewed=_nodes_reviewed,
                    edges_reviewed=_edges_reviewed,
                    suggestions=_suggestions,
                    reviewed_progress=int(
                        (_nodes_reviewed + _edges_reviewed) / (_nodes + _edges) * 100
                    ),
                    type=node_id2detail[node_id]["type"],
                )
            )

            total_errors += _errors
            total_suggestions += _suggestions

        return graph_model.Graph(
            **db_graph,
            subgraphs=subgraphs,
            reviewed_nodes=reviewed_nodes,
            reviewed_edges=reviewed_edges,
            total_errors=total_errors,
            total_suggestions=total_suggestions,
        )
    except Exception as e:
        logger.error(f'Error occurred on "read graph": {e}')


async def get_item_classes(
    graph_id: ObjectId, db: AsyncIOMotorDatabase
) -> Tuple[Dict[ObjectId, str], Dict[ObjectId, str]]:
    item_classes = await db["graphs"].find_one(
        {"_id": graph_id}, {"node_classes": 1, "edge_classes": 1, "_id": 0}
    )
    nodeId2Details = {nc["_id"]: nc for nc in item_classes["node_classes"]}
    edgeId2Details = {ec["_id"]: ec for ec in item_classes["edge_classes"]}

    return nodeId2Details, edgeId2Details


def create_nodes_links(
    triples: List[Dict],
) -> Tuple[List[graph_model.Node], List[graph_model.Link]]:
    """
    Function to create unique nodes and links from triples.

    Parameters:
    triples (List[Dict]): The list of triples.

    Returns:
    Tuple[List[graph_model.Node], List[graph_model.Link]]: The list of unique nodes and links.
    """

    try:
        # Nodes are unique
        node_ids = set()
        nodes = {}

        # Links between nodes
        links = {}

        for t in triples:
            for node_type in ["head", "tail"]:
                node = t[node_type]
                node_id = str(node["_id"])

                if node_id not in node_ids:
                    nodes[node_id] = graph_model.Node(**node)
                    node_ids.add(node_id)

            links[str(t["edge"]["_id"])] = graph_model.Link(
                **t["edge"], source=t["head"]["_id"], target=t["tail"]["_id"]
            )

        return nodes, links
    except Exception as e:
        print(f'Error in "create_nodes_links": {e}')


def get_node_neighbours(nodes, links):
    neighbours = {}
    for node in nodes:
        neighbours[node.id] = {"nodes": set(), "links": set()}

    for link in links:
        a = link.source
        b = link.target

        neighbours[a]["nodes"].add(b)
        neighbours[b]["nodes"].add(a)
        neighbours[a]["links"].add(link.id)
        neighbours[b]["links"].add(link.id)

    neighbours = {
        k: {"nodes": list(v["nodes"]), "links": list(v["links"])}
        for k, v in neighbours.items()
    }

    return neighbours


async def get_subgraph(
    graph_id: ObjectId,
    node_id: Optional[str],
    skip: int,
    limit: int,
    db: AsyncIOMotorDatabase,
):
    """Fetches a single subgraph

    TODO
    ----
    - Add subgraph reviewed progress:
        # reviewed = (
    #     db.query(models.Triple)
    #     .filter(
    #         or_(
    #             models.Triple.subj_id == node.id,
    #             models.Triple.obj_id == node.id,
    #         ),
    #         models.Triple.is_reviewed,
    #     )
    #     .all()
    # )

    # review_prog = len(reviewed) / max_triples

    """
    try:
        logger.info(f"Fetching subgraph: {graph_id}/{node_id}/{skip}/{limit}")

        nodeId2Details, edgeId2Details = await get_item_classes(
            graph_id=graph_id, db=db
        )

        if node_id is not None:
            logger.info(f"Node supplied - no random sampling")
            focus_node_id = node_id
        else:
            logger.info(f"No node supplied - randomly sampling node")
            random_node = (
                await db["nodes"]
                .aggregate(
                    [
                        {"$match": {"graph_id": ObjectId(graph_id)}},
                        {"$sample": {"size": 1}},
                    ]
                )
                .to_list(None)
            )
            if random_node is None:
                raise HTTPException(detail="No node found")

            focus_node_id = random_node[0]["_id"] if random_node else None

        if focus_node_id is None:
            raise HTTPException(detail="No node found")

        focus_node_id = ObjectId(focus_node_id)

        focus_node = await db["nodes"].find_one({"_id": focus_node_id})
        focus_node = graph_model.Node(
            **{**focus_node, "color": nodeId2Details[focus_node["type"]]["color"]}
        )

        max_triples = await db["triples"].count_documents(
            {
                "graph_id": graph_id,
                "$or": [{"head": focus_node_id}, {"tail": focus_node_id}],
            }
        )

        pipeline = [
            {
                "$match": {
                    "graph_id": graph_id,
                    "$or": [{"head": focus_node_id}, {"tail": focus_node_id}],
                }
            },
            {
                "$lookup": {
                    "from": "nodes",
                    "localField": "head",
                    "foreignField": "_id",
                    "as": "head",
                }
            },
            {
                "$lookup": {
                    "from": "nodes",
                    "localField": "tail",
                    "foreignField": "_id",
                    "as": "tail",
                }
            },
            {
                "$lookup": {
                    "from": "edges",
                    "localField": "edge",
                    "foreignField": "_id",
                    "as": "edge",
                }
            },
            {"$unwind": "$head"},
            {"$unwind": "$tail"},
            {"$unwind": "$edge"},
            {
                "$sort": {"head._id": 1, "edge._id": 1, "tail._id": 1, "_id": 1},
            },
            {"$skip": skip},
            {"$limit": limit},
        ]

        triples = await db["triples"].aggregate(pipeline).to_list(None)

        # Add "color" to items so the graph in the UI can render accordingly
        triples = [
            {
                **t,
                "head": {
                    **t["head"],
                    "color": nodeId2Details[ObjectId(t["head"]["type"])]["color"],
                },
                "tail": {
                    **t["tail"],
                    "color": nodeId2Details[ObjectId(t["tail"]["type"])]["color"],
                },
                "edge": {
                    **t["edge"],
                    "color": edgeId2Details[ObjectId(t["edge"]["type"])]["color"],
                },
            }
            for t in triples
        ]

        # TODO: Links should have errors/properties/suggestions/... on them
        nodes, links = create_nodes_links(triples)

        try:
            neighbours = get_node_neighbours(nodes.values(), links.values())
        except Exception as e:
            logger.error(f"Error creating subgraph neighbours: {e}")
            raise HTTPException(details="Unable to fetch subgraph")

        logger.info(f"Sample contains: {len(nodes)} nodes and {len(links)} edges")

        return graph_model.GraphDataWithFocusNode(
            nodes=nodes,
            links=links,
            neighbours=neighbours,
            central_node_id=str(focus_node_id),
            max_triples=max_triples,
            reviewed=0,
            skip=skip,
            limit=limit,
        )
    except Exception as e:
        logger.error(f"An error occurred: {e}")


async def delete_graph(graph_id: ObjectId, db: AsyncIOMotorDatabase):
    """Deletes a single graph including its nodes, edges, and triples."""

    try:
        db_graph = await db["graphs"].find_one({"_id": graph_id})

        if db_graph is None:
            raise Exception("Graph not found")

        await db["graphs"].delete_one({"_id": graph_id})
        await db["edges"].delete_one({"graph_id": graph_id})
        await db["nodes"].delete_one({"graph_id": graph_id})
        await db["triples"].delete_one({"graph_id": graph_id})

        return "Deleted graph"
    except Exception as e:
        logger.error(f"Failed to delete graph: {e}")


async def download(
    graph_id: ObjectId, db: AsyncIOMotorDatabase
):  # -> graph_model.GraphDownload:
    """Prepares graph data for download as JSON in client. Converts _id types to human readable format."""
    try:
        graph = await db["graphs"].find_one({"_id": graph_id})

        if graph is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, details="Graph does not exist"
            )

        nodeId2Name = {n["_id"]: n["name"] for n in graph["node_classes"]}
        edgeId2Name = {e["_id"]: e["name"] for e in graph["edge_classes"]}

        triple_pipeline = [
            {
                "$match": {
                    "graph_id": graph_id,
                }
            },
            {
                "$lookup": {
                    "from": "nodes",
                    "localField": "head",
                    "foreignField": "_id",
                    "as": "head",
                }
            },
            {
                "$lookup": {
                    "from": "nodes",
                    "localField": "tail",
                    "foreignField": "_id",
                    "as": "tail",
                }
            },
            {
                "$lookup": {
                    "from": "edges",
                    "localField": "edge",
                    "foreignField": "_id",
                    "as": "edge",
                }
            },
            {"$unwind": "$head"},
            {"$unwind": "$tail"},
            {"$unwind": "$edge"},
            {
                "$project": {
                    "_id": 0,
                    "graph_id": 0,
                    "head.graph_id": 0,
                    "head._id": 0,
                    "edge.graph_id": 0,
                    "edge._id": 0,
                    "tail.graph_id": 0,
                    "tail._id": 0,
                }
            },
        ]

        triples = await db["triples"].aggregate(triple_pipeline).to_list(None)

        # Transform triples
        data = [
            graph_model.DownloadTriple(
                head=t["head"]["name"],
                head_type=nodeId2Name.get(t["head"]["type"]),
                head_properties={
                    # "main": t["head"]["properties"],
                    "is_reviewed": t["head"]["is_reviewed"],
                    "is_active": t["head"]["is_active"],
                    "created_at": t["head"]["created_at"],
                    "updated_at": t["head"]["updated_at"],
                },
                head_errors=t["head"]["errors"],
                head_suggestions=t["head"]["suggestions"],
                relation=edgeId2Name.get(t["edge"]["type"]),
                relation_properties={
                    "main": t["edge"]["properties"],
                    "is_reviewed": t["edge"]["is_reviewed"],
                    "is_active": t["edge"]["is_active"],
                    "created_at": t["edge"]["created_at"],
                    "updated_at": t["edge"]["updated_at"],
                },
                relation_errors=t["edge"]["errors"],
                relation_suggestions=t["edge"]["suggestions"],
                tail=t["tail"]["name"],
                tail_type=nodeId2Name.get(t["tail"]["type"]),
                tail_properties={
                    "main": t["tail"]["properties"],
                    "is_reviewed": t["tail"]["is_reviewed"],
                    "is_active": t["tail"]["is_active"],
                    "created_at": t["tail"]["created_at"],
                    "updated_at": t["tail"]["updated_at"],
                },
                tail_errors=t["tail"]["errors"],
                tail_suggestions=t["tail"]["suggestions"],
            )
            for t in triples
        ]

        meta = graph_model.DownloadMeta(**graph)
        return graph_model.GraphDownload(meta=meta, data=data)

    except Exception as e:
        logger.error(f"Error occurred downloading graph: {e}")
        raise HTTPException(status_code=500)


async def update_settings(
    graph_id: ObjectId, data: SettingUpdate, db: AsyncIOMotorDatabase
):
    """"""
    try:
        # Check graph exists
        graph_id = ObjectId(graph_id)
        graph = await db["graphs"].find_one({"_id": graph_id}, {"_id": 1})

        if graph is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Graph not found",
            )

        # Update graph settings
        update_data = data.dict(exclude_unset=True)
        # Prepend 'settings.' to each key in the update_data
        update_data = dict(flatten_nested_dict(update_data, parent_key="settings"))
        print("update_data", update_data)

        result = await db["graphs"].update_one(
            {"_id": graph_id},
            {"$set": update_data, "$currentDate": {"updated_at": True}},
            upsert=True,
        )
        # Return if modified.
        updated = result.modified_count > 0
        return {"item_modified": updated}
    except:
        traceback.print_exc()
        return HTTPException(staus_code=500)
