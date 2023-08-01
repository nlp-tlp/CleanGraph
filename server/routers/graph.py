from typing import List, Dict, Tuple, Optional, Union, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from dependencies import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import traceback
from pydantic import BaseModel, Field, root_validator
import collections
from datetime import datetime

import services.create_graph as create_graph_services
import services.graph as graph_services
import services.item as item_services
from models import graph as graph_model
from models.misc import (
    Acknowledge,
    GraphDisplaySettings,
    ColorSettings,
    SettingUpdate,
    ItemType,
    ItemClass,
    ItemClassWithId,
    ItemUpdate,
    ReviewBody,
)


router = APIRouter(prefix="/graph", tags=["Graph"])


UNTYPED_GRAPH_NODE_CLASS = "Unspecified"


@router.post("/")
async def create_graph(
    graph: graph_model.InputGraph,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Creates a graph in the database and optionally executes error detection (edm) and completion (cm) plugins"""
    return await create_graph_services.create_graph(graph=graph, db=db)


@router.get("/", response_model=List[graph_model.SimpleGraph])
async def read_graphs(
    skip: int = 0, limit: int = 10, db: AsyncIOMotorDatabase = Depends(get_db)
) -> List[graph_model.SimpleGraph]:
    """Retrieve a list of graphs from the database"""
    return await graph_services.read_graphs(skip=skip, limit=limit, db=db)


# Positioned before /{graph_id} otherwise may match?
@router.patch("/acknowledge")
async def acknowledge(
    data: Acknowledge = Body(...), db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Acknowledges an error or suggestion on a given item (edge/node)"""

    return await item_services.acknowledge(
        is_error=data.is_error,
        is_node=data.is_node,
        item_id=ObjectId(data.item_id),
        eos_item_id=ObjectId(data.error_or_suggestion_item_id),
        db=db,
    )


@router.get("/{graph_id}", response_model=graph_model.Graph)
async def read_graph(graph_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Fetches the details of a single graph.

    TODO
    ----
    - Compute errors and suggestions for subgraphs and return them.
    - Make process more efficient
    """
    try:
        graph_id = ObjectId(graph_id)
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

        # 3. Aggregate errors on neighbour keys
        total_errors = 0
        total_suggestions = 0
        subgraphs = []
        for neigh in neighbours:
            node_id = neigh["_id"]

            _errors = 0
            _suggestions = 0
            _items = 1  # Starts from one as the central node isn't included in its own neighbours
            _items_reviewed = int(
                node_counts[node_id]["is_reviewed"]
            )  # Starts with the count of the central nodes "is_reviewed" state.

            for n_id in neigh["nodes"]:
                _errors += node_counts[n_id]["errors"]
                _suggestions += node_counts[n_id]["suggestions"]

                _items_reviewed += int(node_counts[n_id]["is_reviewed"])
                _items += 1

            for e_id in neigh["links"]:
                _errors += edge_counts[e_id]["errors"]
                _suggestions += edge_counts[e_id]["suggestions"]

                _items_reviewed += int(edge_counts[e_id]["is_reviewed"])
                _items += 1

            # print(_items, _items_reviewed, _items_reviewed / _items * 100)

            # print("errors: ", _errors, "suggestions: ", _suggestions)
            subgraphs.append(
                graph_model.SubGraph(
                    _id=node_id,
                    name=node_id2detail[node_id]["name"],
                    value=node_id2detail[node_id]["value"],
                    errors=_errors,
                    suggestions=_suggestions,
                    reviewed_progress=int(_items_reviewed / _items * 100),
                    type=node_id2detail[node_id]["type"],
                )
            )

            total_errors += _errors
            total_suggestions += _suggestions

        return graph_model.Graph(
            **db_graph,
            subgraphs=subgraphs,
            total_errors=total_errors,
            total_suggestions=total_suggestions,
        )
    except Exception as e:
        traceback.print_exc()
        print(f'Error occurred on "read graph": {e}')


def get_item_classes(db, graph_id):
    return db["graphs"].find_one(
        {"_id": ObjectId(graph_id)}, {"node_classes": 1, "edge_classes": 1, "_id": 0}
    )


def get_focus_node(db, node_id):
    return db["nodes"].find_one({"_id": ObjectId(node_id)})


def get_max_triples(db, graph_id, node_id):
    return db["triples"].count_documents(
        {
            "graph_id": ObjectId(graph_id),
            "$or": [{"head": ObjectId(node_id)}, {"tail": ObjectId(node_id)}],
        }
    )


def create_pipeline(graph_id, node_id, skip, limit):
    return [
        {
            "$match": {
                "graph_id": ObjectId(graph_id),
                "$or": [{"head": ObjectId(node_id)}, {"tail": ObjectId(node_id)}],
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
        {"$skip": skip},
        {"$limit": limit},
    ]


def get_triples(db, pipeline):
    return db["triples"].aggregate(pipeline).to_list(None)


def customise_triples(triples, node_classes, edge_classes):
    return [
        {
            **t,
            "head": {**t["head"], "color": node_classes[ObjectId(t["head"]["type"])]},
            "tail": {**t["tail"], "color": node_classes[ObjectId(t["tail"]["type"])]},
            "edge": {**t["edge"], "color": edge_classes[ObjectId(t["edge"]["type"])]},
        }
        for t in triples
    ]


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


@router.get(
    "/sample/{graph_id}"
)  # , response_model=graph_model.GraphDataWithFocusNode)
async def sample_graph_data(
    graph_id: str,
    skip: int = 0,
    limit: int = 10,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Randomly samples subgraph. Used for first graph loaded on UI.
    """
    try:
        item_classes = await get_item_classes(db, graph_id)

        # node_classes = {nc["name"]: nc["color"] for nc in item_classes["node_classes"]}
        # edge_classes = {ec["name"]: ec["color"] for ec in item_classes["edge_classes"]}

        node_classes = {nc["_id"]: nc["color"] for nc in item_classes["node_classes"]}
        edge_classes = {ec["_id"]: ec["color"] for ec in item_classes["edge_classes"]}

        random_node = (
            await db["nodes"]
            .aggregate(
                [{"$match": {"graph_id": ObjectId(graph_id)}}, {"$sample": {"size": 1}}]
            )
            .to_list(None)
        )
        if random_node is None:
            raise HTTPException(detail="No node found")

        random_node_id = random_node[0]["_id"] if random_node else None

        focus_node = await get_focus_node(db, random_node_id)
        focus_node = graph_model.Node(
            **{**focus_node, "color": node_classes[focus_node["type"]]}
        )

        max_triples = await get_max_triples(db, graph_id, random_node_id)

        pipeline = create_pipeline(graph_id, random_node_id, skip, limit)

        triples = await get_triples(db, pipeline)

        triples = customise_triples(triples, node_classes, edge_classes)

        # print("sample triples", triples)

        # TODO: Links shuld have errors/properties/suggestions/... on them
        nodes, links = create_nodes_links(triples)

        # print(nodes, links)

        try:
            neighbours = get_node_neighbours(nodes.values(), links.values())
        except Exception as e:
            print(e)

        return graph_model.GraphDataWithFocusNode(
            nodes=nodes,
            links=links,
            neighbours=neighbours,
            central_node_id=str(random_node_id),
            max_triples=max_triples,
            reviewed=0,
        )
    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()  # This will print the traceback including line numbers

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


@router.get("/download/{graph_id}", response_model=graph_model.GraphDownload)
async def download_graph(
    graph_id: str, db: AsyncIOMotorDatabase = Depends(get_db)
) -> graph_model.GraphDownload:
    return await graph_services.download(graph_id=ObjectId(graph_id), db=db)


@router.get("/{graph_id}/{node_id}", response_model=graph_model.GraphDataWithFocusNode)
async def read_graph_data(
    graph_id: str,
    node_id: str,
    skip: int = 0,
    limit: int = 10,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Samples subgraphs based on graph_id and node_id. It then limits the the triples in the subgraph and then converts the data into the format expected by the frontend.
    """

    item_classes = await get_item_classes(db, graph_id)

    node_classes = {nc["_id"]: nc["color"] for nc in item_classes["node_classes"]}
    edge_classes = {ec["_id"]: ec["color"] for ec in item_classes["edge_classes"]}

    # focus_node = await get_focus_node(db, node_id)

    max_triples = await get_max_triples(db, graph_id, node_id)

    pipeline = create_pipeline(graph_id, node_id, skip, limit)

    triples = await get_triples(db, pipeline)

    triples = customise_triples(triples, node_classes, edge_classes)

    nodes, links = create_nodes_links(triples)

    print("nodes", len(nodes), "links", len(links))

    try:
        neighbours = get_node_neighbours(nodes.values(), links.values())
    except Exception as e:
        print(e)

    return graph_model.GraphDataWithFocusNode(
        nodes=nodes,
        links=links,
        neighbours=neighbours,
        central_node_id=str(node_id),
        max_triples=max_triples,
        reviewed=0,
    )

    # item_classes = await db["graphs"].find_one(
    #     {"_id": ObjectId(graph_id)}, {"node_classes": 1, "edge_classes": 1, "_id": 0}
    # )

    # node_classes = {nc["name"]: nc["color"] for nc in item_classes["node_classes"]}
    # edge_classes = {ec["name"]: ec["color"] for ec in item_classes["edge_classes"]}

    # focus_node = await db["nodes"].find_one({"_id": ObjectId(node_id)})

    # max_triples = await db["triples"].count_documents(
    #     {
    #         "graph_id": ObjectId(graph_id),
    #         "$or": [{"head": ObjectId(node_id)}, {"tail": ObjectId(node_id)}],
    #     }
    # )

    # pipeline = [
    #     {
    #         "$match": {
    #             "graph_id": ObjectId(graph_id),
    #             "$or": [{"head": ObjectId(node_id)}, {"tail": ObjectId(node_id)}],
    #         }
    #     },
    #     {
    #         "$lookup": {
    #             "from": "nodes",
    #             "localField": "head",
    #             "foreignField": "_id",
    #             "as": "head",
    #         }
    #     },
    #     {
    #         "$lookup": {
    #             "from": "nodes",
    #             "localField": "tail",
    #             "foreignField": "_id",
    #             "as": "tail",
    #         }
    #     },
    #     {
    #         "$lookup": {
    #             "from": "edges",
    #             "localField": "edge",
    #             "foreignField": "_id",
    #             "as": "edge",
    #         }
    #     },
    #     {"$unwind": "$head"},
    #     {"$unwind": "$tail"},
    #     {"$unwind": "$edge"},
    #     {"$skip": skip},
    #     {"$limit": limit},
    # ]

    # triples = await db["triples"].aggregate(pipeline).to_list(None)

    # # Add customisation to triple constituents (TODO: review efficiency of this route)
    # triples = [
    #     {
    #         **t,
    #         "head": {**t["head"], "color": node_classes[t["head"]["type"]]},
    #         "tail": {**t["tail"], "color": node_classes[t["tail"]["type"]]},
    #         "edge": {**t["edge"], "color": edge_classes[t["edge"]["type"]]},
    #     }
    #     for t in triples
    # ]

    # # print(triples)

    # nodes = list(
    #     itertools.chain.from_iterable(
    #         [
    #             [graph_model.Node(**t["head"]), graph_model.Node(**t["tail"])]
    #             for t in triples
    #         ]
    #     )
    # )

    # links = [
    #     graph_model.Link(**t["edge"], source=t["head"]["_id"], target=t["tail"]["_id"])
    #     for t in triples
    # ]

    # def get_node_neighbours(
    #     nodes: List[graph_model.Node], links: List[graph_model.Link]
    # ) -> dict:
    #     """Creates mapping of nodes to neighbouring nodes/links"""

    #     print("nodes", nodes, "links", links)

    #     neighbours = {}
    #     for node in nodes:
    #         print("node:", node)
    #         neighbours[node.id] = {"nodes": set(), "links": set()}

    #     print(neighbours)

    #     for link in links:
    #         a = link.source
    #         b = link.target

    #         neighbours[a]["nodes"].add(b)
    #         neighbours[b]["nodes"].add(a)
    #         neighbours[a]["links"].add(link.id)
    #         neighbours[b]["links"].add(link.id)

    #     neighbours = {
    #         k: {"nodes": list(v["nodes"]), "links": list(v["links"])}
    #         for k, v in neighbours.items()
    #     }

    #     return neighbours

    # try:
    #     neighbours = get_node_neighbours(nodes=nodes, links=links)
    # except Exception as e:
    #     print(e)

    # return graph_model.GraphDataWithFocusNode(
    #     nodes=nodes,
    #     links=links,
    #     neighbours=neighbours,
    #     node=graph_model.Node(**focus_node),
    #     max_triples=max_triples,
    #     reviewed=0,  # TODO: calculate the fraction of reviewed items on the entire subgraph.
    # )

    # reviewed = (
    #     db.query(models.Triple)
    #     .filter(
    #         or_(
    #             models.Triple.subj_id == node_id,
    #             models.Triple.obj_id == node_id,
    #         ),
    #         models.Triple.is_reviewed,
    #     )
    #     .all()
    # )

    # review_prog = len(reviewed) / max_triples


@router.delete("/property")
async def delete_property(
    item_id: str,
    is_node: bool,
    property_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Deletes a single property from an item (edge/node)"""
    return await item_services.delete_property(
        item_id=ObjectId(item_id),
        property_id=ObjectId(property_id),
        is_node=is_node,
        db=db,
    )


@router.delete("/{graph_id}")
async def delete_graph(
    graph_id: str, db: AsyncIOMotorDatabase = Depends(get_db)
) -> str:
    """Deletes a single graph"""
    return await graph_services.delete_graph(graph_id=ObjectId(graph_id), db=db)


@router.patch("/{item_id}")
async def update_item(
    item_id: str,
    item_type: ItemType = Query(...),
    data: ItemUpdate = Body(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Updates a single graph item (node/edge)"""
    return await item_services.update_item(
        item_id=ObjectId(item_id), item_type=item_type, data=data, db=db
    )


@router.patch("/merge/{node_id}")
async def merge_node(
    node_id: str,
    new_source_name: str,
    new_source_type: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Performs node merge operation"""
    return await item_services.merge_nodes(
        node_id=ObjectId(node_id),
        new_source_name=new_source_name,
        new_source_type=new_source_type,
        db=db,
    )


@router.patch("/settings/{graph_id}")
async def update_settings(
    graph_id: str,
    data: SettingUpdate = Body(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, bool]:
    """Updates graph project settings."""
    return await graph_services.update_settings(
        graph_id=ObjectId(graph_id), data=data, db=db
    )


@router.patch("/activation/{item_id}")
async def toggle_activation(
    item_id: str,
    is_node: bool = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Toggles the activation state of a given item and its neighbours in the database"""
    return await item_services.toggle_activation(
        item_id=ObjectId(item_id), is_node=is_node, db=db
    )


@router.patch("/review/{item_id}")
async def toggle_review(
    item_id: str,
    is_node: bool = Query(...),
    data: ReviewBody = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Toggles the review state of a given item and optionally its neighbours."""
    return await item_services.toggle_review(
        item_id=ObjectId(item_id), is_node=is_node, data=data, db=db
    )


@router.post("/item-classes/{graph_id}")
async def add_item_class(
    graph_id: str,
    item_class: ItemClass,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Adds a new graph item (node/edge) class"""
    return await item_services.add_item_class(
        graph_id=ObjectId(graph_id), item_class=item_class, db=db
    )


@router.patch("/item-classes/{graph_id}")
async def update_item_class(
    graph_id: str,
    item_class: ItemClassWithId,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Updates an existing item class"""
    return await item_services.update_item_class(
        graph_id=ObjectId(graph_id), item_class=item_class, db=db
    )
