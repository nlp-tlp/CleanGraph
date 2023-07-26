from typing import List, Dict, Tuple, Optional, Union, Any
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from dependencies import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError
from bson import ObjectId
import traceback
from enum import Enum
from pydantic import BaseModel, Field, root_validator
import collections
from datetime import datetime
from pymongo import UpdateOne
from collections import defaultdict

from services.utils import generate_high_contrast_colors, gen_random_properties

from models import graph as graph_model

from plugin_models import ModelInput, ModelTriple
from plugin_manager import PluginManager

router = APIRouter(prefix="/graph", tags=["Graph"])


class ItemType(str, Enum):
    node = "node"
    edge = "edge"


class ItemUpdate(BaseModel):
    name: Optional[str]
    type: Optional[str]
    is_reviewed: Optional[bool]
    is_active: Optional[bool]
    properties: Optional[List[Dict[str, Any]]]
    reverse_direction: Optional[bool]


async def cleanup_graph(graph_id: ObjectId, db: AsyncIOMotorDatabase):
    """Cleans up graph for instnaces where something has gone wrong."""

    await db["graphs"].delete_one({"_id": graph_id})
    await db["edges"].delete_one({"graph_id": graph_id})
    await db["nodes"].delete_one({"graph_id": graph_id})
    await db["triples"].delete_one({"graph_id": graph_id})


UNTYPED_GRAPH_NODE_CLASS = "Unspecified"


@router.post("/")
async def create_graph(
    graph: graph_model.InputGraph,  # = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    This function creates a graph in the database. It also executes error detection (edm) and completion (cm) plugins (if specified).
    """

    try:
        # Create graph
        db_graph = await db["graphs"].insert_one(
            graph_model.CreateGraph(
                **graph.dict(),
                start_node_count=0,
                start_edge_count=0,
                settings=graph_model.Settings(
                    display_errors=(graph.plugins.edm is not None),
                    display_suggestions=(graph.plugins.cm is not None),
                ),
            ).dict()
        )
        print("Created base graph project")

        nodes_collection = db["nodes"]
        edges_collection = db["edges"]
        triples_collection = db["triples"]

        node_classes = set()
        edge_classes = set()

        # TODO: allow properties to be added. Currently they are dropped.
        nodes = Counter()
        triples = Counter()
        for entry in graph.triples:
            # Handles construction of simple and complex graphs...

            nodes[(entry.head, entry.head_type)] += 1
            nodes[(entry.tail, entry.tail_type)] += 1
            triples[
                (
                    entry.head,
                    entry.head_type,
                    entry.relation,
                    entry.tail,
                    entry.tail_type,
                )
            ] += 1

            # Capture classes
            if entry.head_type:
                # Only add if they are supplied
                node_classes.add(entry.head_type)
            if entry.tail_type:
                # Only add if they are supplied
                node_classes.add(entry.tail_type)
            edge_classes.add(entry.relation)

        if len(node_classes) == 0:
            # Untyped graph
            print("Untyped graph")
            node_classes.add(UNTYPED_GRAPH_NODE_CLASS)

        # Create node/edge classes with _ids
        node_classes_with_ids = {name: ObjectId() for name in set(node_classes)}
        edge_classes_with_ids = {name: ObjectId() for name in set(edge_classes)}

        print("node_classes_with_ids", node_classes_with_ids)
        print("edge_classes_with_ids", edge_classes_with_ids)

        # Create unique nodes with respective frequencies
        # NOTE: THIS ASSUMES THE INSERTED_IDS ARE THE SAME ORDER AS THE NODE DATA DOCS
        node_data = []
        node_ids = {}

        for (name, type_), frequency in nodes.items():
            node_data.append(
                graph_model.CreateItem(
                    name=name,
                    type=node_classes_with_ids[
                        type_
                    ],  # UNTYPED_GRAPH_NODE_CLASS if type_ is None else type_, # TODO: make this work for untyped graphs.
                    value=frequency,
                    graph_id=db_graph.inserted_id,
                    properties=gen_random_properties(),
                ).dict()
            )

        try:
            result = await nodes_collection.insert_many(node_data)
            for (name, type_), inserted_id in zip(nodes.keys(), result.inserted_ids):
                node_ids[(name, type_)] = inserted_id
        except Exception as e:
            raise Exception(f"Unable to create node: {e}")

        print("Created nodes")

        # Create unique edges with respective frequencies
        # NOTE: THIS ASSUMES THE INSERTED_IDS ARE THE SAME ORDER AS THE EDGE DATA DOCS
        edge_data = []
        edge_ids = {}

        for (head, head_type, relation, tail, tail_type), frequency in triples.items():
            edge_data.append(
                graph_model.CreateItem(
                    type=edge_classes_with_ids[relation],
                    value=frequency,
                    graph_id=db_graph.inserted_id,
                ).dict()
            )

        try:
            result = await edges_collection.insert_many(edge_data)
            for (head, head_type, relation, tail, tail_type), inserted_id in zip(
                triples.keys(), result.inserted_ids
            ):
                edge_ids[(head, head_type, relation, tail, tail_type)] = inserted_id
        except Exception as e:
            raise Exception(f"Unable to create edge: {e}")

        print("Created edges")

        # Update graph with node/edge counts and classes
        node_class_colors = generate_high_contrast_colors(
            len(node_classes_with_ids.keys())
        )
        edge_class_colors = generate_high_contrast_colors(
            len(edge_classes_with_ids.keys())
        )

        await db["graphs"].update_one(
            {"_id": db_graph.inserted_id},
            {
                "$set": {
                    "start_node_count": len(nodes),
                    "start_edge_count": len(triples),
                    "node_classes": [
                        {"_id": _id, "name": name, "color": node_class_colors[i]}
                        for i, (name, _id) in enumerate(node_classes_with_ids.items())
                    ],
                    "edge_classes": [
                        {"_id": _id, "name": name, "color": edge_class_colors[i]}
                        for i, (name, _id) in enumerate(edge_classes_with_ids.items())
                    ],
                }
            },
        )
        print("updated graph project")

        # Update triples with _ids of nodes and edges
        triple_data = []
        for triple in triples:
            head, head_type, relation, tail, tail_type = triple
            triple_data.append(
                {
                    "head": node_ids[(head, head_type)],
                    "edge": edge_ids[(head, head_type, relation, tail, tail_type)],
                    "tail": node_ids[(tail, tail_type)],
                    "graph_id": db_graph.inserted_id,
                }
            )

        # Insert triples in batch
        await triples_collection.insert_many(triple_data)
        print("created triples")

        # Run error detection and completion models (if supplied)
        plugin_manager = PluginManager()
        plugin_manager.load_plugins(
            "./plugins"
        )  # TODO: make this .env variable or something
        plugins = plugin_manager.get_plugins()

        print(plugins)

        if graph.plugins.edm:
            # print("EDM specified", graph.plugins.edm)
            edm_plugin = plugins["edm"][graph.plugins.edm]
            # print("edm_plugin", edm_plugin)

            # Get expected data (populated triples) for plugin
            # TODO: make this call only done once and allow data to be used in both plugins independently
            # TODO: refactor as this triple extraction and formatting is the same as the "download" route
            populated_triple_pipeline = [
                {
                    "$match": {
                        "graph_id": db_graph.inserted_id,
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
                        "edge.graph_id": 0,
                        "tail.graph_id": 0,
                    }
                },
            ]

            triples = (
                await db["triples"].aggregate(populated_triple_pipeline).to_list(None)
            )

            node_id2name = {v: k for k, v in node_classes_with_ids.items()}
            edge_id2name = {v: k for k, v in edge_classes_with_ids.items()}

            # Transform triples - NOTE: head/relation/tail types are their human readable names, not their ObjectIds
            data = ModelInput(
                triples=[
                    ModelTriple(
                        head=t["head"]["name"],
                        head_type=node_id2name[t["head"]["type"]],
                        head_id=str(t["head"]["_id"]),
                        head_properties=t["head"]["properties"],
                        relation=edge_id2name[t["edge"]["type"]],
                        relation_properties=t["edge"]["properties"],
                        relation_id=str(t["edge"]["_id"]),
                        tail=t["tail"]["name"],
                        tail_type=node_id2name[t["tail"]["type"]],
                        tail_properties=t["tail"]["properties"],
                        tail_id=str(t["tail"]["_id"]),
                    )
                    for t in triples
                ]
            )

            # Execute plugin
            edm_output = edm_plugin.execute(
                triples=data.dict(exclude_unset=True)["triples"]
            )

            # print("edm_output", edm_output)

            # Update nodes with EDM errors
            for err in edm_output.data:
                # print("error", err)
                # Convert error into expected format for error array

                new_error = graph_model.Error(
                    error_type=err.error_type, error_value=err.error_value
                ).dict()

                # print("new error", new_error)

                if err.is_node:
                    # print("adding new error to node!")
                    # Can optimise my tracking node errors and pushing them all at once as some nodes will have more than one error.
                    result = await db["nodes"].update_one(
                        {"_id": ObjectId(err.id)}, {"$push": {"errors": new_error}}
                    )
                    # print("modified", result.modified_count > 0)

        if graph.plugins.cm:
            print("CM specified", graph.plugins.cm)
            cm_plugin = plugins["cm"][graph.plugins.cm]
            # print("edm_plugin", edm_plugin)

            # TODO: make DRY - copied from EDM flow.
            # Get expected data (populated triples) for plugin
            # TODO: make this call only done once and allow data to be used in both plugins independently
            # TODO: refactor as this triple extraction and formatting is the same as the "download" route
            populated_triple_pipeline = [
                {
                    "$match": {
                        "graph_id": db_graph.inserted_id,
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
                        "edge.graph_id": 0,
                        "tail.graph_id": 0,
                    }
                },
            ]

            triples = (
                await db["triples"].aggregate(populated_triple_pipeline).to_list(None)
            )

            node_id2name = {v: k for k, v in node_classes_with_ids.items()}
            edge_id2name = {v: k for k, v in edge_classes_with_ids.items()}

            # Transform triples - NOTE: head/relation/tail types are their human readable names, not their ObjectIds
            data = ModelInput(
                triples=[
                    ModelTriple(
                        head=t["head"]["name"],
                        head_type=node_id2name[t["head"]["type"]],
                        head_id=str(t["head"]["_id"]),
                        head_properties=t["head"]["properties"],
                        relation=edge_id2name[t["edge"]["type"]],
                        relation_properties=t["edge"]["properties"],
                        relation_id=str(t["edge"]["_id"]),
                        tail=t["tail"]["name"],
                        tail_type=node_id2name[t["tail"]["type"]],
                        tail_properties=t["tail"]["properties"],
                        tail_id=str(t["tail"]["_id"]),
                    )
                    for t in triples
                ]
            )
            # Execute plugin
            cm_output = cm_plugin.execute(
                triples=data.dict(exclude_unset=True)["triples"]
            )

            # Update nodes with CM suggestion
            for suggestion in cm_output.data:
                # print("suggestion", suggestion)
                # Convert suggestion into expected format for suggestion array

                new_suggestion = graph_model.Suggestion(
                    suggestion_type=suggestion.suggestion_type,
                    suggestion_value=suggestion.suggestion_value,
                ).dict()

                if suggestion.is_node:
                    # print("adding new suggestion to node!")
                    # Can optimise my tracking node suggestion and pushing them all at once as some nodes will have more than one error.
                    result = await db["nodes"].update_one(
                        {"_id": ObjectId(suggestion.id)},
                        {"$push": {"suggestions": new_suggestion}},
                    )
                    # print("modified", result.modified_count > 0)

        return {"id": str(db_graph.inserted_id)}
    except PyMongoError as e:
        # logging.error(f"An error occurred while processing the graph: {str(e)}")

        await cleanup_graph(graph_id=db_graph.inserted_id, db=db)

        raise HTTPException(status_code=500, detail="Internal server error")
    except Exception as e:
        await cleanup_graph(graph_id=db_graph.inserted_id, db=db)
        traceback.print_exc()


@router.get("/", response_model=List[graph_model.SimpleGraph])
async def read_graphs(
    skip: int = 0, limit: int = 10, db: AsyncIOMotorDatabase = Depends(get_db)
) -> List[graph_model.SimpleGraph]:
    """
    Retrieve a list of graphs from the database, skipping the first 'skip' records and limiting the result to 'limit' records.
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


class Acknowledge(BaseModel):
    # TODO: redo semantics, a bit confusing with items being nodes/edges with ids too...
    is_node: bool  # node or edge
    item_id: str
    is_error: bool  # true error false suggestion
    error_or_suggestion_item_id: str  # UUID of error/suggestion id


# Positioned before /{graph_id} otherwise may match?
@router.patch("/acknowledge")
async def acknowledge(
    data: Acknowledge = Body(...), db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Acknowledges an error or suggestion on a given item (edge/node)"""

    try:
        array_name = "errors" if data.is_error else "suggestions"

        result = await db["nodes" if data.is_node else "edges"].update_one(
            {
                "_id": ObjectId(data.item_id),
                f"{array_name}.id": ObjectId(data.error_or_suggestion_item_id),
            },
            {
                "$set": {
                    f"{array_name}.$.acknowledged": True,
                },
                "$currentDate": {f"{array_name}.$.updated_at": True},
            },
        )
        # print("result", result.modified_count)

        updated = result.modified_count > 0
        return {"item_acknowledged": updated}

    except Exception as e:
        traceback.print_exc()


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
    """
    Downloads graph as JSON
    """
    try:
        graph_id = ObjectId(graph_id)

        graph = await db["graphs"].find_one({"_id": graph_id})

        if graph is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, details="Graph does not exist"
            )

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
                head_type=t["head"]["type"],
                head_properties={
                    "main": t["head"]["properties"],
                    "is_reviewed": t["head"]["is_reviewed"],
                    "is_active": t["head"]["is_active"],
                    "created_at": t["head"]["created_at"],
                    "updated_at": t["head"]["updated_at"],
                },
                head_errors=t["head"]["errors"],
                head_suggestions=t["head"]["suggestions"],
                relation=t["edge"]["type"],
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
                tail_type=t["tail"]["type"],
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
        traceback.print_exc()
        print(f"Error occurred downloading graph: {e}")
        raise HTTPException(status_code=500)


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
    """Deletes an items (edge/node) property"""

    result = await db["nodes" if is_node else "edges"].update_one(
        {"_id": ObjectId(item_id)},
        {"$pull": {"properties": {"id": ObjectId(property_id)}}},
    )

    property_deleted = result.modified_count > 0

    return {"property_deleted": property_deleted}


@router.delete("/{graph_id}")
async def delete_graph(
    graph_id: str, db: AsyncIOMotorDatabase = Depends(get_db)
) -> str:
    """
    Deletes a single graph
    """
    try:
        graph_id = ObjectId(graph_id)

        db_graph = await db["graphs"].find_one({"_id": graph_id})

        if db_graph is None:
            raise HTTPException(detail="Graph does not exist")

        # Delete triples, nodes, edges and graph
        await db["triples"].delete_many({"graph_id": graph_id})
        await db["nodes"].delete_many({"graph_id": graph_id})
        await db["edges"].delete_many({"graph_id": graph_id})
        await db["graphs"].delete_many({"_id": graph_id})

        return "Deleted graph"
    except Exception as e:
        print(f"Error occurred deleting graph: {e}")


@router.patch("/{item_id}")
async def update_item(
    item_id: str,
    item_type: ItemType = Query(...),
    data: ItemUpdate = Body(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Updates a single item (edge/node)

    If the item is a node and the update includes name/type and a node of the same type exists in the db, the user will need to confirm and this will trigger a merge operation.

    """
    try:
        print(data, item_type)

        if item_type not in ItemType:
            raise HTTPException(
                status_code=400,
                detail="Item type must be either 'node' or 'edge'",
            )

        # Data is provided and item type is valid.
        item_id = ObjectId(item_id)

        # Check existence of item
        if item_type == ItemType.node:
            item = await db["nodes"].find_one({"_id": item_id})
        elif item_type == ItemType.edge:
            item = await db["edges"].find_one({"_id": item_id})

        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found",
            )

        if item_type == ItemType.node:
            name_or_type_update = item["name"] != data.name or item["type"] != ObjectId(
                data.type
            )
            graph_id = ObjectId(item["graph_id"])
            if name_or_type_update:
                print("Node having name/type updated...")
                # Need to check whether any other nodes on this graph exist with the same node/type combo.

                existing_node = await db["nodes"].find_one(
                    {
                        "graph_id": graph_id,
                        "name": data.name,
                        "type": ObjectId(data.type),
                        "_id": {"$ne": item_id},
                    }
                )

                linked_triples = 0
                if existing_node:
                    # Get count of triples it has connected to it.
                    triples = (
                        await db["triples"]
                        .find(
                            {
                                "graph_id": graph_id,
                                "$or": [
                                    {"head": existing_node["_id"]},
                                    {"tail": existing_node["_id"]},
                                ],
                            },
                            {"_id": 1},
                        )
                        .to_list(None)
                    )
                    linked_triples = len(triples)
                    print("existing_node", existing_node)
                    return {
                        "node_exists": existing_node is not None,
                        "linked_triples": linked_triples,
                    }

        # Update item
        update_data = data.dict(exclude_none=True)

        if update_data.get("type", None) is not None:
            update_data["type"] = ObjectId(update_data["type"])

        if item_type == ItemType.edge:
            update_data.pop("name", None)
        if item_type == ItemType.node:
            update_data.pop("reverse_direction", None)

        if update_data.get("reverse_direction"):
            print("reversing edge!")
            try:
                # Get triple edge is on
                triple = await db["triples"].find_one({"edge": item_id})
                # Swap head/tail
                result = await db["triples"].update_one(
                    {"edge": item_id},
                    {
                        "$set": {"head": triple["tail"], "tail": triple["head"]},
                        "$currentDate": {"updated_at": True},
                    },
                )
            except:
                traceback.print_exc()

        else:
            print("updating item")
            try:
                result = await db[
                    "nodes" if item_type == ItemType.node else "edges"
                ].update_one(
                    {"_id": item_id},
                    {"$set": update_data, "$currentDate": {"updated_at": True}},
                    # upsert=True,
                )
            except:
                traceback.print_exc()

        updated = result.modified_count > 0
        return {"item_modified": updated}
    except:
        traceback.print_exc()


def concatenate_arrays(
    array1: List[Dict[str, str]], array2: List[Dict[str, str]]
) -> List[Dict[str, str]]:
    """
    Concatenates two lists of dictionaries, giving precedence to the first list's elements
    when there are duplicate 'name' and 'value_type' pairs.

    Args:
        array1: The first list of dictionaries. Each dictionary has the keys 'name', 'value', 'value_type'.
        array2: The second list of dictionaries. Each dictionary has the keys 'name', 'value', 'value_type'.

    Returns:
        A list containing all unique dictionaries from array1 and array2. When there is a
        name and value_type pair that appears in both lists, the corresponding dictionary
        from array1 is included in the output list.
    """
    combined_dict = {
        (item["name"], item["value_type"]): item for item in reversed(array2)
    }
    combined_dict.update(
        {(item["name"], item["value_type"]): item for item in reversed(array1)}
    )
    return list(combined_dict.values())


@router.patch("/merge/{node_id}")
async def merge_node(
    node_id: str,
    new_source_name: str,
    new_source_type: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Performs node merge operation.

    Merges a given node by _id with any other node when matching on name/type keys. Properties of both nodes will be merged and all triples will be combined into a new node. Review statuses and activations will remain as they were, etc.
    """
    try:
        node_id = ObjectId(node_id)
        new_source_type = ObjectId(new_source_type)
        source_node = await db["nodes"].find_one({"_id": node_id})

        if source_node is None:
            raise HTTPException(
                status_code=404, details="Unable to merge node - source node not found."
            )

        graph_id = ObjectId(source_node["graph_id"])

        # Find matching node by matching on "name" and "type"
        target_node = await db["nodes"].find_one(
            {
                "graph_id": graph_id,
                "name": new_source_name,
                "type": new_source_type,
            }
        )

        if target_node is None:
            raise HTTPException(
                status_code=404, details="Unable to merge node - target node not found."
            )

        # Both source/target nodes exist
        source_id = ObjectId(source_node["_id"])
        target_id = ObjectId(target_node["_id"])

        # Create new merged node (merges properties together), sets is_reviewed and is_active to defaults.
        merged_node_properties = concatenate_arrays(
            array1=target_node.get("properties", []),
            array2=source_node.get("properties", []),
        )

        new_merged_node = graph_model.CreateItem(
            name=new_source_name,
            type=new_source_type,
            properties=merged_node_properties,
            value=source_node["value"] + target_node["value"],
            errors=source_node["errors"] + target_node["errors"],
            suggestions=source_node["suggestions"] + target_node["suggestions"],
            is_reviewed=False,
            is_active=True,
            graph_id=graph_id,
        )

        # Find all triples that are referenced to the source/target nodes and reassign them to the new node; deleting any that would be self referenced.
        pipeline = [
            {
                "$match": {
                    "graph_id": graph_id,
                    "$or": [
                        {"head": {"$in": [source_id, target_id]}},
                        {"tail": {"$in": [source_id, target_id]}},
                    ],
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
                    "graph_id": 0,
                    "head.graph_id": 0,
                    "edge.graph_id": 0,
                    "tail.graph_id": 0,
                }
            },
        ]

        triples = await db["triples"].aggregate(pipeline).to_list(None)

        # 3. Create new merged node
        db_new_merged_node = await db["nodes"].insert_one(new_merged_node.dict())
        new_merged_node_id = db_new_merged_node.inserted_id

        def replace_id(id):
            return new_merged_node_id if id in [source_id, target_id] else id

        # UPDATE triples and edges
        new_edges = defaultdict(list)
        for triple in triples:
            head_id = replace_id(triple["head"]["_id"])
            tail_id = replace_id(triple["tail"]["_id"])
            edge_type = triple["edge"]["type"]

            if head_id != tail_id:
                # Update edge information
                base_triple = (head_id, edge_type, tail_id)
                new_edges[base_triple].append(triple["edge"])

        # Merge edges, create new triples and edges, remove old triples/edges
        for base_triple, edges in new_edges.items():
            head_id, edge_type, tail_id = base_triple

            # TODO: filter errors/suggestions to make context make sense.
            edge_errors = []
            edge_suggestions = []
            edge_properties = []
            edge_value = 0
            edge_ids = []

            for e in edges:
                edge_errors.extend(e["errors"])
                edge_suggestions.extend(e["suggestions"])
                edge_properties.extend(e["properties"])
                edge_value += e["value"]
                edge_ids.append(ObjectId(e["_id"]))

            merged_edge = graph_model.CreateItem(
                type=edge_type,
                value=edge_value,
                properties=edge_properties,
                errors=edge_errors,
                suggestions=edge_suggestions,
                is_reviewed=False,
                is_active=True,
                graph_id=graph_id,
            )

            # Create new edge
            _new_merged_edge = await db["edges"].insert_one(merged_edge.dict())
            _new_merged_edge_id = _new_merged_edge.inserted_id

            # Create new triple
            await db["triples"].insert_one(
                {
                    "head": ObjectId(head_id),
                    "edge": _new_merged_edge_id,
                    "tail": ObjectId(tail_id),
                    "graph_id": graph_id,
                    "updated_at": datetime.utcnow(),
                    "created_at": datetime.utcnow(),
                }
            )

            # Delete existing edges
            await db["edges"].delete_many({"_id": {"$in": edge_ids}})

            # # Delete old triple(s)
            await db["triples"].delete_many(
                {"graph_id": graph_id, "edge": {"$in": edge_ids}}
            )

        # Delete existing nodes
        await db["nodes"].delete_many({"_id": {"$in": [source_id, target_id]}})

        # Return new subgraph data
        unique_nodes = {}
        unique_edges = {}

        total_errors = 0
        total_suggestions = 0
        total_reviewed = 0

        for item in triples:
            for node_type in ["head", "tail"]:
                node = item[node_type]
                node_id = node["_id"]

                if node_id not in unique_nodes:
                    unique_nodes[node_id] = node
                    total_errors += len(node["errors"])
                    total_suggestions += len(node["suggestions"])
                    total_reviewed += int(node["is_reviewed"])

            edge = item["edge"]
            edge_id = edge["_id"]

            if edge_id not in unique_edges:
                unique_edges[edge_id] = edge
                total_errors += len(edge["errors"])
                total_suggestions += len(edge["suggestions"])
                total_reviewed += int(edge["is_reviewed"])

        total_items = len(unique_nodes) + len(unique_edges)

        new_subgraph = graph_model.SubGraph(
            _id=new_merged_node_id,
            name=new_merged_node.name,
            type=new_merged_node.type,
            value=new_merged_node.value,
            errors=total_errors,
            suggestions=total_suggestions,
            reviewed_progress=total_reviewed / total_items,
        )

        return graph_model.MergedNode(
            item_modified=True,
            new_node=graph_model.Node(**new_merged_node.dict(), _id=new_merged_node_id),
            old_node_ids=[str(source_id), str(target_id)],
            new_subgraph=new_subgraph,
        )

    except:
        traceback.print_exc()


class GraphDisplaySettings(BaseModel):
    display_graph_edges: Optional[bool]
    node_size: Optional[str]
    limit: Optional[int]


class ColorSettings(BaseModel):
    deactivated: Optional[str]
    reviewed: Optional[str]
    error: Optional[str]
    suggestion: Optional[str]


class SettingUpdate(BaseModel):
    display_errors: Optional[bool]
    display_suggestions: Optional[bool]
    graph: Optional[GraphDisplaySettings]
    colors: Optional[ColorSettings]


def flatten_nested_dict(d: Dict[str, Any], parent_key="", sep=".") -> Dict[str, Any]:
    """
    Flatten a nested dictionary by concatenating nested keys with a dot.
    For example, given the input:
    {
        'a': {
            'b': 1,
            'c': {
                'd': 2
            }
        },
        'e': 3
    }
    The output will be:
    {
        'a.b': 1,
        'a.c.d': 2,
        'e': 3
    }

    Arguments
    ---------
    d: The input dictionary, potentially nested.
    parent_key: The string to prepend to dictionary's keys.
    sep: The separator between nested keys.

    Returns
    -------
    A new dictionary with the same data as 'd', but with no nested dictionaries and
    with compound string keys for nested fields.

    Notes
    -----
    In MongoDB, updating a nested field requires using 'dot notation'. This function
    takes a dictionary that potentially contains nested dictionaries and returns a new
    dictionary with no nested dictionaries. Instead, the keys in the output dictionary
    are compound strings that concatenate the keys from the input dictionary,
    effectively mimicking the 'dot notation' required by MongoDB to reach into nested
    fields. This is useful when the fields to be updated in the database document
    are not known in advance or are nested at various levels.

    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, collections.MutableMapping):
            items.extend(flatten_nested_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


@router.patch("/settings/{graph_id}")
async def update_settings(
    graph_id: str,
    data: SettingUpdate = Body(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, bool]:
    # Check graph exists
    try:
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


@router.patch("/activation/{item_id}")
async def toggle_activation(
    item_id: str,
    is_node: bool = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Toggles the activation state of a given item and its neighbours in the database.

    This endpoint receives an item's id and its type (node or edge) and inverses its "is_active" status. If the item is a node, the function also identifies all its connected edges (1-hop) and any orphan nodes that would result if these edges were removed. For an edge item, it identifies any connected nodes that would be orphaned if the edge was removed. The activation state for all these identified nodes and edges is also toggled.

    Parameters:
    - item_id: The unique identifier of the item (node or edge) whose activation state is to be toggled.
    - is_node: Boolean flag that indicates whether the item is a node (True) or an edge (False).

    Returns:
    A dictionary containing:
    - "item_updated": A boolean indicating whether the operation was successful.
    - "updated_node_ids": A list of the ids of the nodes that had their activation state toggled.
    - "updated_edge_ids": A list of the ids of the edges that had their activation state toggled.

    Raises:
    Any exceptions raised are logged and printed to standard error.

    Database:
    This function interacts with a MongoDB database via the `db` parameter which is an instance of AsyncIOMotorDatabase.

    """

    try:
        item_id = ObjectId(item_id)

        collection = "nodes" if is_node else "edges"

        # Retrieve the item
        item = await db[collection].find_one({"_id": item_id})

        # Get current 'is_active' state and compute its inverse
        is_active = item.get("is_active", False)
        new_state = not is_active
        updated_at = datetime.utcnow()

        # Update the item with the new 'is_active' state
        update_result = await db[collection].update_one(
            {"_id": item_id},
            {"$set": {"is_active": new_state, "updated_at": updated_at}},
        )

        # Check if the update was successful
        item_updated = update_result.modified_count > 0

        orphan_nodes = []
        orphan_edges = []

        # Only do 1-hop or orphan logic if deactivating.
        if new_state is False:
            if is_node:
                connected_edges = (
                    await db["triples"]
                    .find({"$or": [{"head": item_id}, {"tail": item_id}]})
                    .to_list(None)
                )

                for edge in connected_edges:
                    # get the count of edges connected to the head and tail
                    count_head = await db["triples"].count_documents(
                        {"$or": [{"head": edge["head"]}, {"tail": edge["head"]}]}
                    )
                    count_tail = await db["triples"].count_documents(
                        {"$or": [{"head": edge["tail"]}, {"tail": edge["tail"]}]}
                    )
                    # if the count is 1, they will be orphaned if the edge is removed
                    if count_head == 1:
                        orphan_nodes.append(edge["head"])
                    if count_tail == 1:
                        orphan_nodes.append(edge["tail"])

                    orphan_edges.append(edge["edge"])  # NOTE: _id is the triple id.

            else:  # is_node = False
                # get the edge with the provided id
                edge = await db["triples"].find_one({"_id": item_id})
                if edge:
                    # get the count of edges connected to the head and tail
                    count_head = await db["triples"].count_documents(
                        {"$or": [{"head": edge["head"]}, {"tail": edge["head"]}]}
                    )
                    count_tail = await db["triples"].count_documents(
                        {"$or": [{"head": edge["tail"]}, {"tail": edge["tail"]}]}
                    )
                    # if the count is 1, they will be orphaned if the edge is removed
                    if count_head == 1:
                        orphan_nodes.append(edge["head"])
                    if count_tail == 1:
                        orphan_nodes.append(edge["tail"])

            # Update the orphan nodes and edges
            await db["nodes"].update_many(
                {"_id": {"$in": orphan_nodes}},
                {"$set": {"is_active": new_state, "updated_at": updated_at}},
            )
            await db["edges"].update_many(
                {"_id": {"$in": orphan_edges}},
                {"$set": {"is_active": new_state, "updated_at": updated_at}},
            )

        return {
            "item_updated": item_updated,
            "updated_node_ids": [str(id) for id in orphan_nodes],
            "updated_edge_ids": [str(id) for id in orphan_edges],
        }
    except:
        traceback.print_exc()


class ReviewBody(BaseModel):
    review_all: bool = Field(
        default=False,
        description="Flag indicating whether the entire connected subgraph reviewed state should be toggled.",
    )
    neighbours: Optional[Dict]

    @root_validator(pre=True)
    def check_neighbours(cls, values):
        review_all = values.get("review_all")
        neighbours = values.get("neighbours")

        if review_all and neighbours is None:
            raise ValueError("neighbours must be provided if review_all is True")
        return values


@router.patch("/review/{item_id}")
async def toggle_review(
    item_id: str,
    is_node: bool = Query(...),
    data: ReviewBody = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Toggles the review state of a given item and optionally its neighbours.

    This endpoint receives an item's id, type (node or edge), and a ReviewBody object,
    then changes the item's "is_reviewed" status. If the "review_all" flag in the ReviewBody
    object is set to True, the review status of all neighbouring nodes (in the current UI view) and edges is also toggled.

    Parameters:
    - item_id: The unique identifier of the item (node or edge) whose review state is to be toggled.
    - is_node: Boolean flag that indicates whether the item is a node (True) or an edge (False).
    - data: ReviewBody object that contains a boolean "review_all" field, indicating whether
            the review state of all connected nodes and edges should also be toggled,
            and an optional "neighbours" field that lists the ids of neighbouring nodes and edges.

    Returns:
    A dictionary with a single key, "item_reviewed", whose value is a boolean indicating whether
    the operation was successful.

    Raises:
    HTTPException with a status code of 404 if the provided item_id does not correspond to an
    existing item in the database. Any exceptions raised are logged and printed to standard error.

    Database:
    This function interacts with a MongoDB database via the `db` parameter which is an instance of AsyncIOMotorDatabase.
    """

    try:
        item_id = ObjectId(item_id)
        collection = "nodes" if is_node else "edges"
        updated_at = datetime.utcnow()

        item = await db[collection].find_one({"_id": item_id})

        if item is None:
            raise HTTPException(status_code=404, detail="Item not found")

        is_reviewed = item.get("is_reviewed", False)

        if data.review_all:
            # Set all items inc. neighbours as True (this is the review all button action)

            # item_id is used twice but only one will match in the respective collection
            updated_nodes = await db["nodes"].update_many(
                {
                    "_id": {
                        "$in": [
                            item_id,
                            *[ObjectId(_id) for _id in data.neighbours["nodes"]],
                        ]
                    }
                },
                {"$set": {"is_reviewed": True, "updated_at": updated_at}},
            )
            updated_edges = await db["edges"].update_many(
                {
                    "_id": {
                        "$in": [
                            item_id,
                            *[ObjectId(_id) for _id in data.neighbours["links"]],
                        ]
                    }
                },
                {"$set": {"is_reviewed": True, "updated_at": updated_at}},
            )

            item_reviewed = (
                updated_nodes.modified_count > 0 or updated_edges.modified_count
            )

        else:
            result = await db[collection].update_one(
                {"_id": item_id},
                {"$set": {"is_reviewed": not is_reviewed, "updated_at": updated_at}},
            )

            item_reviewed = result.modified_count > 0

        # TODO: Returns updated reviewed_progress for all items involved

        # Populate all triples where the item is involved
        # 1. Fetch triples where item matches head/relation/tail
        # 2. Populate "is_reviewed" field
        # 3. Count is_reviewed field
        # 4. Count subgraph size
        # 5. Return [{node_id: progress}, ...]

        # , "reviewed_progress": 0
        return {"item_reviewed": item_reviewed}

    except:
        traceback.print_exc()


class ItemClass(BaseModel):
    is_node: bool
    name: str
    color: str


@router.post("/item-classes/{graph_id}")
async def add_item_class(
    graph_id: str,
    item_class: ItemClass,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        class_list_name = f'{"node" if item_class.is_node else "edge"}_classes'

        graph_id = ObjectId(graph_id)

        graph = await db["graphs"].find_one({"_id": graph_id}, {class_list_name: 1})

        if graph is None:
            raise HTTPException(status_code=404, detail="Graph not found")

        class_exists = any(
            i for i in graph[class_list_name] if i["name"] == item_class.name
        )

        if not class_exists:
            # Create new class
            new_class_object = {
                "_id": ObjectId(),
                "name": item_class.name,
                "color": item_class.color,
            }

            result = await db["graphs"].update_one(
                {"_id": graph_id}, {"$push": {class_list_name: new_class_object}}
            )

            return {
                "classes_modified": result.modified_count > 0,
                "new_class": {**new_class_object, "_id": str(new_class_object["_id"])},
            }
        else:
            return {"classes_modified": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ItemClassWithId(ItemClass):
    id: str


@router.patch("/item-classes/{graph_id}")
async def update_item_class(
    graph_id: str,
    item_class: ItemClassWithId,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        class_list_name = f'{"node" if item_class.is_node else "edge"}_classes'

        graph_id = ObjectId(graph_id)

        graph = await db["graphs"].find_one({"_id": graph_id}, {class_list_name: 1})

        if graph is None:
            raise HTTPException(status_code=404, detail="Graph not found")

        print("item_class", item_class)
        print("class_list_name", class_list_name)

        result = await db["graphs"].update_one(
            {
                "_id": graph_id,
                f"{class_list_name}._id": ObjectId(item_class.id),
            },
            {
                "$set": {
                    f"{class_list_name}.$.name": item_class.name,
                    f"{class_list_name}.$.color": item_class.color,
                },
                "$currentDate": {f"{class_list_name}.$.updated_at": True},
            },
        )

        return {"classes_modified": result.modified_count > 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# @app.patch("/graphs/merge/{graph_id}/{node_id}")
# def merge_graph(
#     node_id: int,
#     merge_node_ids: List[int],
#     db: Session = Depends(get_db),
# ):
#     """Merges subgraphs. all triples from `merge_node_ids` will be merged into `node_id`.
#     Merged nodes will be removed from the database.

#     Note:
#         - Any triples that will become self-referential are ignored.
#         - Any duplicate triples will be removed.
#     """

#     triples = (
#         db.query(models.Triple)
#         .filter(
#             or_(
#                 models.Triple.subj_id.in_(merge_node_ids),
#                 models.Triple.obj_id.in_(merge_node_ids),
#             )
#         )
#         .all()
#     )

#     print("triples to merge", len(triples))

#     new_triples = 0
#     for t in triples:
#         if (t.subj_id in merge_node_ids) & (t.obj_id in merge_node_ids):
#             # Self-referential triple as subj/obj will go to `node_id`
#             pass
#         else:
#             new_triples += 1
#             if t.subj_id in merge_node_ids:
#                 db.query(models.Triple).filter(models.Triple.id == t.id).update(
#                     {"subj_id": node_id}
#                 )
#             else:
#                 db.query(models.Triple).filter(models.Triple.id == t.id).update(
#                     {"obj_id": node_id}
#                 )

#     # Delete merged nodes
#     db.query(models.Node).filter(models.Node.id.in_(merge_node_ids)).delete()

#     # Update new node with degree with additional triples
#     node_to_update = db.query(models.Node).filter(models.Node.id == node_id).first()
#     node_to_update.value = (
#         node_to_update.value + new_triples
#     )  # TODO: This fails to increment correctly if merged_nodes are connected to the `node_id`

#     db.commit()

#     return f"Merged {len(merge_node_ids)+1}"


# @app.patch("/graphs/node/review/{node_id}")
# def review_graph(node_id: int, is_reviewed: bool, db: Session = Depends(get_db)):
#     """Sets state of given node, its relations and 1-hop neighbours reviewed state."""

#     print(node_id, is_reviewed)

#     triples = (
#         db.query(models.Triple)
#         .filter(or_(models.Triple.subj_id == node_id, models.Triple.obj_id == node_id))
#         .all()
#     )

#     # print(triples)

#     stranded_candidate_ids = set(
#         itertools.chain.from_iterable([[t.subj_id, t.obj_id] for t in triples])
#     )

#     # Remove focus node
#     stranded_candidate_ids = [nId for nId in stranded_candidate_ids if nId != node_id]

#     # print(stranded_candidate_ids)

#     # Check whether nodes are stranded if focus node is deactivated; these node are not connected to any other triples or
#     # the other triples are deactivated already
#     stranded_ids = []
#     for nId in stranded_candidate_ids:
#         candidate_triples = (
#             db.query(models.Triple)
#             .filter(
#                 and_(
#                     models.Triple.subj_id != node_id,
#                     models.Triple.obj_id != node_id,
#                     or_(models.Triple.subj_id == nId, models.Triple.obj_id == nId),
#                     models.Triple.is_active == True,
#                 )
#             )
#             .all()
#         )
#         # print(f"Candidate Node ID: {nId} - Triples: {len(candidate_triples)}")

#         if len(candidate_triples) == 0:
#             stranded_ids.append(nId)

#     # print("Number of stranded_ids", len(stranded_ids))

#     # Set `is_active` state on nodes and triples
#     node_ids_to_update = stranded_ids + [node_id]

#     for nId in node_ids_to_update:
#         db.query(models.Node).filter(models.Node.id == nId).update(
#             {"is_reviewed": is_reviewed}
#         )

#     for t in triples:
#         db.query(models.Triple).filter(models.Triple.id == t.id).update(
#             {"is_reviewed": is_reviewed}
#         )

#     db.commit()
#     return {"triple_ids": [t.id for t in triples], "nodes_ids": node_ids_to_update}


# @app.patch("/graphs/relation/change-direction/{triple_id}")
# def change_triple_direction(triple_id: int, db: Session = Depends(get_db)):
#     """Changes directionality of relation between two nodes"""

#     triple = db.query(models.Triple).filter(models.Triple.id == triple_id).first()
#     obj_id = triple.obj_id
#     subj_id = triple.subj_id
#     triple.subj_id = obj_id
#     triple.obj_id = subj_id
#     db.commit()
#     return "Changed direction"


# @app.patch("/graphs/relation/deactivate/{triple_id}")
# def deactivate_triple(triple_id: int, is_active: bool, db: Session = Depends(get_db)):
#     """Actives/deactivates relation between nodes"""

#     db.query(models.Triple).filter(models.Triple.id == triple_id).update(
#         {"is_active": is_active}
#     )
#     db.commit()
#     return "Updated triple"


# @app.patch("/graphs/node/deactivate/{node_id}")
# def deactivate_node(node_id: int, is_active: bool, db: Session = Depends(get_db)):
#     """Actives/deactivates a given node and its stranded neighbours (limited to 1-hop distance). This includes relationships.

#     TODO: Update iterative updates to use bulk update method.
#     """

#     triples = (
#         db.query(models.Triple)
#         .filter(or_(models.Triple.subj_id == node_id, models.Triple.obj_id == node_id))
#         .all()
#     )

#     # print(triples)

#     stranded_candidate_ids = set(
#         itertools.chain.from_iterable([[t.subj_id, t.obj_id] for t in triples])
#     )

#     # Remove focus node
#     stranded_candidate_ids = [nId for nId in stranded_candidate_ids if nId != node_id]

#     # print(stranded_candidate_ids)

#     # Check whether nodes are stranded if focus node is deactivated; these node are not connected to any other triples or
#     # the other triples are deactivated already
#     stranded_ids = []
#     for nId in stranded_candidate_ids:
#         candidate_triples = (
#             db.query(models.Triple)
#             .filter(
#                 and_(
#                     models.Triple.subj_id != node_id,
#                     models.Triple.obj_id != node_id,
#                     or_(models.Triple.subj_id == nId, models.Triple.obj_id == nId),
#                     models.Triple.is_active == True,
#                 )
#             )
#             .all()
#         )
#         # print(f"Candidate Node ID: {nId} - Triples: {len(candidate_triples)}")

#         if len(candidate_triples) == 0:
#             stranded_ids.append(nId)

#     # print("Number of stranded_ids", len(stranded_ids))

#     # Set `is_active` state on nodes and triples
#     node_ids_to_update = stranded_ids + [node_id]

#     for nId in node_ids_to_update:
#         db.query(models.Node).filter(models.Node.id == nId).update(
#             {"is_active": is_active}
#         )

#     for t in triples:
#         db.query(models.Triple).filter(models.Triple.id == t.id).update(
#             {"is_active": is_active}
#         )

#     db.commit()
#     return {"triple_ids": [t.id for t in triples], "nodes_ids": node_ids_to_update}


# @app.patch("/graphs/node/{node_id}")
# def update_node(node_id: int, node: schemas.NodeUpdate, db: Session = Depends(get_db)):
#     """Updates node information - `name` and `type`"""
#     # NOTE: Couldn't get node.dict() to work to automatically unpack schema into Node model...
#     db.query(models.Node).filter(models.Node.id == node_id).update(
#         {"name": node.name, "type_id": node.type}
#     )

#     db.commit()
#     return "Updated node"
