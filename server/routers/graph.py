from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, Query, Body
from dependencies import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

import services.create_graph as create_graph_services
import services.graph as graph_services
import services.item as item_services
from models import graph as graph_model
from models.misc import (
    Acknowledge,
    SettingUpdate,
    ItemType,
    ItemClass,
    ItemClassWithId,
    ItemUpdate,
    ReviewBody,
)


router = APIRouter(prefix="/graph", tags=["Graph"])


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
    """Fetches the details of a single graph"""
    return await graph_services.read_graph(graph_id=ObjectId(graph_id), db=db)


@router.get(
    "/sample/{graph_id}"
)  # , response_model=graph_model.GraphDataWithFocusNode)
async def sample_graph_data(
    graph_id: str,
    node_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Samples subgraph (randomly if node_id not provided)."""
    return await graph_services.get_subgraph(
        graph_id=ObjectId(graph_id), node_id=node_id, skip=skip, limit=limit, db=db
    )


@router.get("/download/{graph_id}", response_model=graph_model.GraphDownload)
async def download_graph(
    graph_id: str, db: AsyncIOMotorDatabase = Depends(get_db)
) -> graph_model.GraphDownload:
    return await graph_services.download(graph_id=ObjectId(graph_id), db=db)


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
