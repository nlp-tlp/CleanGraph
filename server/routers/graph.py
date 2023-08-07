from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from dependencies import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

import random

from models import graph as graph_model
from models.misc import (
    Acknowledge,
    SettingUpdate,
    ItemType,
    ItemClass,
    ItemClassWithId,
    ItemUpdate,
    ReviewBody,
    AddItemsBody,
)
import services.create_graph as create_graph_services
import services.graph as graph_services
import services.item as item_services


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


@router.get("/items/{graph_id}")
async def get_graph_items(graph_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Gets unique graph items"""

    graph_id = ObjectId(graph_id)

    print("graph_id", graph_id)

    graph_classes = await db["graphs"].find_one(
        {"_id": graph_id}, {"node_classes": 1, "edge_classes": 1}
    )

    nodes_names = (
        await db["nodes"].find({"graph_id": graph_id}, {"name": 1}).to_list(None)
    )

    unique_node_names = set([n["name"] for n in nodes_names])

    return {
        "node_names": unique_node_names,
        "node_types": [
            {**nc, "_id": str(nc["_id"])} for nc in graph_classes["node_classes"]
        ],
        "edge_types": [
            {**ec, "_id": str(ec["_id"])} for ec in graph_classes["edge_classes"]
        ],
    }


@router.post("/item/{graph_id}")
async def add_graph_items(
    graph_id: str,
    data: AddItemsBody = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Adds a new item(s) to the graph.

    Two operations:
    - New node and edge
    - New edge
    """
    try:
        graph_id = ObjectId(graph_id)

        graph = await db["graphs"].find_one(
            {"_id": graph_id}, {"node_classes": 1, "edge_classes": 1}
        )

        if graph is None:
            raise HTTPException(details="Graph not found")

        # data = AddItemsBody(
        #     head_name="hello",
        #     head_type=str(random.choice(graph["node_classes"]).get("_id")),
        #     edge=str(random.choice(graph["edge_classes"]).get("_id")),
        #     tail_name="world",
        #     tail_type=str(random.choice(graph["node_classes"]).get("_id")),
        # )

        print("data", data)

        # Check if head / tail nodes exist in the db
        head_node = await db["nodes"].find_one(
            {
                "graph_id": graph_id,
                "name": data.head_name,
                "type": ObjectId(data.head_type),
            }
        )

        print("head exists" if head_node else "head does not exist")

        tail_node = await db["nodes"].find_one(
            {
                "graph_id": graph_id,
                "name": data.tail_name,
                "type": ObjectId(data.tail_type),
            }
        )
        print("tail exists" if tail_node else "tail does not exist")

        if head_node and tail_node:
            # head and tail exist - need to check whether the edge exists between them. If so, do nothing, else create triple.
            print("Checking whether edge exists")

            # Get all triples with head/tail combination then check edge existence... checks both directions...
            triples = (
                await db["triples"]
                .find(
                    {
                        "head": {"$in": [head_node["_id"], tail_node["_id"]]},
                        "tail": {"$in": [head_node["_id"], tail_node["_id"]]},
                    }
                    # {
                    #     "$or": [
                    #         {
                    #             "$and": [
                    #                 {"head": head_node["_id"]},
                    #                 {"tail": tail_node["_id"]},
                    #             ]
                    #         },
                    #         {
                    #             "$and": [
                    #                 {"head": tail_node["_id"]},
                    #                 {"tail": head_node["_id"]},
                    #             ]
                    #         },
                    #     ]
                    # }
                )
                .to_list(None)
            )

            print(f"Found {len(triples)} triples that match head/tail nodes")

            if len(triples) != 0:
                return {"triple_exists": True}

            head_node_id = head_node["_id"]
            tail_node_id = tail_node["_id"]

            print("headId", head_node_id, "tailId", tail_node_id)

        else:
            # Otherwise, just create a new triple in the graph
            print("Creating new item")

            # TODO: get data model for create nodes to insert properly...
            if head_node is None:
                # Create head node
                new_head_node = graph_model.CreateItem(
                    name=data.head_name,
                    type=ObjectId(data.head_type),
                    value=1,
                    graph_id=graph_id,
                )
                print(f"Creating head node: {new_head_node}")

                head_node = await db["nodes"].insert_one(new_head_node.dict())
                head_node_id = head_node.inserted_id
                print(f"Created head node: {head_node_id}")
            else:
                # Head exists, get the id
                head_node_id = head_node["_id"]

            if tail_node is None:
                # Create tail node
                new_tail_node = graph_model.CreateItem(
                    name=data.tail_name,
                    type=ObjectId(data.tail_type),
                    value=1,
                    graph_id=graph_id,
                )
                print(f"Creating tail node: {new_tail_node}")

                tail_node = await db["nodes"].insert_one(new_tail_node.dict())
                tail_node_id = tail_node.inserted_id
                print(f"Created tail node: {tail_node_id}")
            else:
                # Tail exists, get the id
                tail_node_id = tail_node["_id"]

        # Create edge...
        new_edge = graph_model.CreateItem(
            type=ObjectId(data.edge), value=1, graph_id=graph_id
        )
        print(f"Creating edge: {new_edge}")
        edge = await db["edges"].insert_one(new_edge.dict())
        edge_id = edge.inserted_id
        print(f"Created edge: {edge_id}")

        print("Creating triple")
        # Create triple...
        new_triple = graph_model.CreateTriple(
            head=head_node_id, edge=edge_id, tail=tail_node_id, graph_id=graph_id
        )
        print(f"Creating triple: {new_triple}")
        triple = await db["triples"].insert_one(new_triple.dict())
        triple_id = triple.inserted_id
        print(f"Created triple: {triple_id}")

        output = {"head": head_node, "edge": edge, "tail": tail_node}

        print("output", output)

        return {
            "triple_exists": False,
            "nodes": {str(head_node_id): {}, str(tail_node_id): {}},
            "links": {},
        }

    except Exception as e:
        print(f"Exception: {e}")
