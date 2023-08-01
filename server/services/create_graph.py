from typing import List, Dict, Tuple, Optional, Union, Any, Set
from collections import Counter
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError
from bson import ObjectId
import traceback

from loguru import logger

from services.utils import generate_high_contrast_colors, gen_random_properties
from services.plugins import execute_plugins
from services.graph import delete_graph

from models import graph as graph_model

UNTYPED_GRAPH_NODE_CLASS = "Unspecified"


async def cleanup_graph(graph_id: ObjectId, db: AsyncIOMotorDatabase):
    """Cleans up graph for instnaces where something has gone wrong."""
    await delete_graph(graph_id=graph_id, db=db)


def extract_nodes_and_edges(
    graph: graph_model.InputGraph,
) -> Tuple[Dict[Tuple, int], Dict[Tuple, int], Set, Set]:
    """
    Processes graph data to extract nodes and triples.

    Extracts unique nodes and triples including their freqeuencies and types which are used to create node/edge taxonomies.
    Graph data can be simple {head, relation, tail} or complex {head, head_type, head_properties, ...}


    TODO
    ----
    - Allow properties to be added. Currently they are dropped whenever users upload rich graph data.
    """

    node_classes = set()
    edge_classes = set()

    nodes = Counter()
    triples = Counter()
    for entry in graph.triples:
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
        # Untyped graph uploaded
        logger.info("Untyped graph")
        node_classes.add(UNTYPED_GRAPH_NODE_CLASS)

    return nodes, triples, node_classes, edge_classes


def create_ontology_classes(
    node_classes: Set[str], edge_classes: Set[str]
) -> Tuple[Dict[str, ObjectId], Dict[str, ObjectId]]:
    """
    Creates node and edge classes with bson ObjectIds for graph population.
    """
    node_classes_with_ids = {name: ObjectId() for name in set(node_classes)}
    edge_classes_with_ids = {name: ObjectId() for name in set(edge_classes)}

    logger.info(
        "Created ontology classes",
    )

    return node_classes_with_ids, edge_classes_with_ids


async def create_insert_nodes(
    nodes_db_collection,
    nodes: Dict[Tuple, int],
    node_classes_with_ids: Dict[str, ObjectId],
    graph_id: ObjectId,
) -> Dict[Tuple, ObjectId]:
    """
    Create unique nodes with frequencies and insert into graph database.

    NOTE
    ----
    THIS ASSUMES THE INSERTED_IDS ARE THE SAME ORDER AS THE NODE DATA DOCS

    TODO
    ----
    UNTYPED_GRAPH_NODE_CLASS if type_ is None else type_, # TODO: make this work for untyped graphs.

    """
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
                graph_id=graph_id,
                properties=gen_random_properties(),
            ).dict()
        )

    try:
        result = await nodes_db_collection.insert_many(node_data)
        for (name, type_), inserted_id in zip(nodes.keys(), result.inserted_ids):
            node_ids[(name, type_)] = inserted_id
    except Exception as e:
        logger.error(e)
        raise Exception(f"Unable to create node: {e}")

    logger.info("Created nodes")

    return node_ids


async def create_insert_edges(
    edges_db_collection,
    triples: Dict[Tuple, int],
    edge_classes_with_ids: Dict[str, ObjectId],
    graph_id: ObjectId,
) -> Dict[Tuple, ObjectId]:
    """
    Create unique edges with respective frequencies

    NOTE
    ----
    THIS ASSUMES THE INSERTED_IDS ARE THE SAME ORDER AS THE EDGE DATA DOCS

    TODO
    ----
    - Add properties
    """
    edge_data = []
    edge_ids = {}

    for (head, head_type, relation, tail, tail_type), frequency in triples.items():
        edge_data.append(
            graph_model.CreateItem(
                type=edge_classes_with_ids[relation],
                value=frequency,
                graph_id=graph_id,
            ).dict()
        )

    try:
        result = await edges_db_collection.insert_many(edge_data)
        for (head, head_type, relation, tail, tail_type), inserted_id in zip(
            triples.keys(), result.inserted_ids
        ):
            edge_ids[(head, head_type, relation, tail, tail_type)] = inserted_id
    except Exception as e:
        logger.error(e)
        raise Exception(f"Unable to create edge: {e}")

    logger.info("Created edges")

    return edge_ids


async def add_graph_ontology_and_counts(
    graphs_db_collection: Any,
    graph_id: ObjectId,
    node_classes_with_ids: Dict[str, ObjectId],
    edge_classes_with_ids: Dict[str, ObjectId],
    start_node_count: int,
    start_edge_count: int,
) -> None:
    """
    Updates a graph entry in the database with initial node/edge counts, ontology classes, and their corresponding colors.
    """
    node_class_colors = generate_high_contrast_colors(len(node_classes_with_ids.keys()))
    edge_class_colors = generate_high_contrast_colors(len(edge_classes_with_ids.keys()))

    await graphs_db_collection.update_one(
        {"_id": graph_id},
        {
            "$set": {
                "start_node_count": start_node_count,
                "start_edge_count": start_edge_count,
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

    logger.info(f"Added node/edge counts and ontology to graph with _id: {graph_id}")


async def create_insert_triples(
    triples_db_collection: Any,
    triples: Dict[Tuple, int],
    node_ids: Dict[Tuple, ObjectId],
    edge_ids: Dict[Tuple, ObjectId],
    graph_id: ObjectId,
) -> None:
    """
    Create triples and insert them into graph database.
    """
    triple_data = []
    for triple in triples:
        head, head_type, relation, tail, tail_type = triple
        triple_data.append(
            {
                "head": node_ids[(head, head_type)],
                "edge": edge_ids[(head, head_type, relation, tail, tail_type)],
                "tail": node_ids[(tail, tail_type)],
                "graph_id": graph_id,
            }
        )

    # Insert triples in batch
    await triples_db_collection.insert_many(triple_data)
    logger.info("created triples")


async def create_graph(graph: graph_model.InputGraph, db: AsyncIOMotorDatabase):
    """
    Creates a graph in the database.

    Note
    ----
    It also executes error detection (edm) and completion (cm) plugins (if specified).
    """

    try:
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

        graph_id = db_graph.inserted_id

        logger.info(f"Created base graph project with _id: {str(graph_id)}")

        nodes, triples, node_classes, edge_classes = extract_nodes_and_edges(
            graph=graph
        )

        node_classes_with_ids, edge_classes_with_ids = create_ontology_classes(
            node_classes=node_classes, edge_classes=edge_classes
        )

        node_ids = await create_insert_nodes(
            nodes_db_collection=db["nodes"],
            nodes=nodes,
            node_classes_with_ids=node_classes_with_ids,
            graph_id=graph_id,
        )

        edge_ids = await create_insert_edges(
            edges_db_collection=db["edges"],
            triples=triples,
            edge_classes_with_ids=edge_classes_with_ids,
            graph_id=graph_id,
        )

        await add_graph_ontology_and_counts(
            graphs_db_collection=db["graphs"],
            graph_id=graph_id,
            node_classes_with_ids=node_classes_with_ids,
            edge_classes_with_ids=edge_classes_with_ids,
            start_node_count=len(nodes),
            start_edge_count=len(triples),
        )

        await create_insert_triples(
            triples_db_collection=db["triples"],
            triples=triples,
            node_ids=node_ids,
            edge_ids=edge_ids,
            graph_id=graph_id,
        )

        await execute_plugins(db=db, graph_id=graph_id, graph_plugins=graph.plugins)

        return {"id": str(graph_id)}
    except PyMongoError as e:
        logger.error(f"An error occurred while processing the graph: {str(e)}")
        await cleanup_graph(graph_id=db_graph.inserted_id, db=db)
        raise HTTPException(status_code=500, detail="Internal server error")
    except Exception as e:
        logger.error(f"An error occurred while processing the graph: {str(e)}")
        await cleanup_graph(graph_id=db_graph.inserted_id, db=db)
        traceback.print_exc()
    except:
        await cleanup_graph(graph_id=db_graph.inserted_id, db=db)
