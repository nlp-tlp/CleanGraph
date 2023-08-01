from typing import List, Dict, Tuple, Optional, Union, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from loguru import logger

from models import graph as graph_model

from plugin_models import ModelInput, ModelTriple
from plugin_manager import PluginManager
from settings import settings


def get_available_plugins():
    """Fetches available plugins from plugin directory"""
    plugin_manager = PluginManager()
    plugin_manager.load_plugins(settings.PLUGIN_DIRECTORY)
    plugins = plugin_manager.get_plugins()
    return plugins


async def get_graph_data(
    db: AsyncIOMotorDatabase, graph_id: ObjectId
) -> Tuple[ModelInput, Dict[str, ObjectId], Dict[str, ObjectId]]:
    """Fetches graph data in format required for CleanGraph plugins (populated triples)

    TODO
    ----
    - Make this call only done once and allow data to be used in both plugins independently
    - Refactor as this triple extraction and formatting is the same as the "download" route

    """

    populated_triple_pipeline = [
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
                "edge.graph_id": 0,
                "tail.graph_id": 0,
            }
        },
    ]

    triples = await db["triples"].aggregate(populated_triple_pipeline).to_list(None)

    graph = await db["graphs"].find_one(
        {"_id": graph_id}, {"node_classes": 1, "edge_classes": 1}
    )

    nodeId2Name = {n["_id"]: n["name"] for n in graph["node_classes"]}
    edgeId2Name = {e["_id"]: e["name"] for e in graph["edge_classes"]}

    # Transform triples - NOTE: head/relation/tail types are their human readable names, not their ObjectIds
    data = ModelInput(
        triples=[
            ModelTriple(
                head=t["head"]["name"],
                head_type=nodeId2Name[t["head"]["type"]],
                head_id=str(t["head"]["_id"]),
                head_properties=t["head"]["properties"],
                relation=edgeId2Name[t["edge"]["type"]],
                relation_properties=t["edge"]["properties"],
                relation_id=str(t["edge"]["_id"]),
                tail=t["tail"]["name"],
                tail_type=nodeId2Name[t["tail"]["type"]],
                tail_properties=t["tail"]["properties"],
                tail_id=str(t["tail"]["_id"]),
            )
            for t in triples
        ]
    )

    nodeName2Id = {v: k for k, v in nodeId2Name.items()}
    edgeName2Id = {v: k for k, v in edgeId2Name.items()}

    return data, nodeName2Id, edgeName2Id


async def execute_edm(
    db: AsyncIOMotorDatabase,
    edm_plugin,
    data: ModelInput,
    nodeName2Id: Dict[str, ObjectId],
    edgeName2Id: Dict[str, ObjectId],
):
    """Executes error detection model (EDM)"""

    edm_output = edm_plugin.execute(triples=data.dict(exclude_unset=True)["triples"])

    logger.debug(f"edm_output sample: {edm_output.data[:5]}")

    # Update nodes with EDM errors
    for err in edm_output.data:
        # Convert error into expected format for error array

        if err.is_node:
            # _item_type = node_classes_with_ids.get(err.action.item_type_name)

            # Add item_type id to object.
            err.action.data.item_type = str(
                nodeName2Id.get(err.action.data.item_type_name)
            )
            # print("err action data", err.action.data)

            new_error = graph_model.Error(**err.dict()).dict()

            # print("adding new error to node!")
            # Can optimise my tracking node errors and pushing them all at once as some nodes will have more than one error.
            result = await db["nodes"].update_one(
                {"_id": ObjectId(err.item_id)}, {"$push": {"errors": new_error}}
            )
            # print("modified", result.modified_count > 0)

        # TODO: implement link errors...


async def execute_cm(
    db: AsyncIOMotorDatabase,
    cm_plugin,
    data: ModelInput,
    nodeName2Id: Dict[str, ObjectId] = None,
    edgeName2Id: Dict[str, ObjectId] = None,
):
    """ """
    # Execute plugin
    cm_output = cm_plugin.execute(triples=data.dict(exclude_unset=True)["triples"])

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


async def execute_plugins(
    db: AsyncIOMotorDatabase, graph_id: ObjectId, graph_plugins: graph_model.Plugins
) -> None:
    """
    Executes specified error detection models (EDM) and completion models (CM) on graph data.

    Parameters:
    - db: The database instance
    - graph_id: The ObjectId of the graph
    - graph_plugins: The plugins that will be used to process the graph data

    The function first retrieves available plugins and the graph data. Then it executes the EDM and CM plugins
    if they are specified in the graph_plugins parameter.
    """

    try:
        plugins = get_available_plugins()
        logger.debug(f"Available plugins: {plugins}")

        if graph_plugins.edm or graph_plugins.cm:
            data, nodeName2Id, edgeName2Id = await get_graph_data(
                db=db, graph_id=graph_id
            )
            logger.info(f"Created graph data")

        if graph_plugins.edm:
            edm_plugin = plugins["edm"][graph_plugins.edm]
            logger.info(f"Executing EDM plugin - {graph_plugins.edm}")
            await execute_edm(
                db=db,
                edm_plugin=edm_plugin,
                data=data,
                nodeName2Id=nodeName2Id,
                edgeName2Id=edgeName2Id,
            )

        if graph_plugins.cm:
            cm_plugin = plugins["cm"][graph_plugins.cm]
            logger.info(f"Executing CM plugin - {graph_plugins.cm}")
            await execute_cm(db=db, cm_plugin=cm_plugin, data=data)

    except Exception as e:
        logger.error(f"Error executing plugin(s): {e}")
