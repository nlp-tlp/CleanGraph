"""Services for performing CRUD operation on entire graphs"""

from typing import List, Dict, Tuple, Optional, Union, Any, Set
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
