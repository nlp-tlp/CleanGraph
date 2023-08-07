from typing import List, Dict, Tuple, Optional, Union, Generator, Any
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from dependencies import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError
from bson import ObjectId
import traceback
import random
from enum import Enum
from pydantic import BaseModel
import collections
import string

from models import graph as graph_model
from services.graph import get_item_classes

router = APIRouter(prefix="/errors", tags=["Errors"])


@router.get("/{graph_id}")
async def get_errors(graph_id: str, db: AssertionError = Depends(get_db)):
    """Fetches all errors on the current graph

    TODO
    ----
    - Add limit and page.
    """

    try:
        graph_id = ObjectId(graph_id)

        nodeId2Details, edgeId2Details = await get_item_classes(
            graph_id=graph_id, db=db
        )

        nodes_with_errors = (
            await db["nodes"]
            .find(
                {
                    "graph_id": graph_id,
                    "errors": {"$exists": True, "$not": {"$size": 0}},
                },
                {"errors": 1, "name": 1, "type": 1, "_id": 1},
            )
            .to_list(None)
        )

        node_errors = []
        for node in nodes_with_errors:
            _errors = [
                graph_model.OutputError(
                    # item_id=node["_id"],
                    is_node=True,
                    item_name=node["name"],
                    item_type=nodeId2Details[node["type"]]["name"],
                    **e,
                )
                for e in node["errors"]
            ]

            node_errors.extend(_errors)

        return node_errors

        # edge_errors = (
        #     await db["edges"]
        #     .find(
        #         {
        #             "graph_id": graph_id,
        #             "errors": {"$exists": True, "$not": {"$size": 0}},
        #         },
        #         {"errors": 1},
        #     )
        #     .to_list(None)
        # )
        # edge_errors = [graph_model.OutputError(**ee) for ee in edge_errors["errors"]]

        # return {"node_errors": len(node_errors), "edge_errors": len(edge_errors)}
    except:
        traceback.print_exc()
