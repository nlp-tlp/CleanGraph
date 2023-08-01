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

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])


@router.get("/{graph_id}")
async def get_suggestions(graph_id: str, db: AssertionError = Depends(get_db)):
    """Fetches all suggestions on the current graph

    TODO
    ----
    - Add limit and page.
    """

    try:
        graph_id = ObjectId(graph_id)

        nodes_with_suggestions = (
            await db["nodes"]
            .find(
                {
                    "graph_id": graph_id,
                    "suggestions": {"$exists": True, "$not": {"$size": 0}},
                },
                {"suggestions": 1, "name": 1, "type": 1, "_id": 1},
            )
            .to_list(None)
        )

        node_suggestions = []
        for node in nodes_with_suggestions:
            _errors = [
                graph_model.OutputSuggestion(
                    # item_id=node["_id"],
                    is_node=True,
                    item_name=node["name"],
                    item_type=str(node["type"]),
                    **s,
                )
                for s in node["suggestions"]
            ]

            node_suggestions.extend(_errors)

        return node_suggestions
    except:
        traceback.print_exc()
