"""Services for performing CRUD operations on graph items (nodes/edges)"""

from typing import Dict
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import traceback
from datetime import datetime
from collections import defaultdict
from loguru import logger

from models import graph as graph_model
from models.misc import ItemClass, ItemClassWithId, ItemType, ItemUpdate, ReviewBody
from .utils import concatenate_arrays


async def delete_property(
    item_id: ObjectId, property_id: ObjectId, is_node: bool, db: AsyncIOMotorDatabase
):
    """Deletes a single property from an item (node/edge)"""

    try:
        result = await db["nodes" if is_node else "edges"].update_one(
            {"_id": ObjectId(item_id)},
            {"$pull": {"properties": {"id": ObjectId(property_id)}}},
        )

        property_deleted = result.modified_count > 0

        return {"property_deleted": property_deleted}
    except Exception as e:
        logger.error(f"Unable to delete property - {e}")


async def merge_nodes(
    node_id: ObjectId,
    new_source_name: str,
    new_source_type: str,
    db: AsyncIOMotorDatabase,
):
    """Performs node merge operation.

    Merges a given node by _id with any other node when matching on name/type keys. Properties of both nodes will be merged and all triples will be combined into a new node. Review statuses and activations will remain as they were, etc.

    Source node errors and suggestions are marked as "acknowledged" and any action performed will have its "executed" state set to True.
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


async def acknowledge(
    is_error: bool,
    is_node: bool,
    item_id: ObjectId,
    eos_item_id: ObjectId,
    db: AsyncIOMotorDatabase,
) -> Dict[str, bool]:
    """Acknowledges an error or suggestion on a given item (edge/node)

    NOTE
    ----
    - "eos" refers to "error or suggestion"
    """

    try:
        array_name = "errors" if is_error else "suggestions"

        result = await db["nodes" if is_node else "edges"].update_one(
            {
                "_id": item_id,
                f"{array_name}.id": eos_item_id,
            },
            {
                "$set": {
                    f"{array_name}.$.acknowledged": True,
                },
                "$currentDate": {f"{array_name}.$.updated_at": True},
            },
        )
        updated = result.modified_count > 0
        return {"item_acknowledged": updated}

    except Exception as e:
        logger.error(f"Failed to acknowledge item: {e}")


async def update_item(
    item_id: ObjectId, item_type: ItemType, data: ItemUpdate, db: AsyncIOMotorDatabase
):
    """
    Updates a single graph item (node/edge)

    If the item is a node and the update includes name/type and a node of the same type exists in the db, the user will need to confirm and this will trigger a merge operation.

    """
    try:
        print('Executing: "update_item" ')
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

                print(f"Node exists: {existing_node}")

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


async def toggle_activation(item_id: ObjectId, is_node: bool, db: AsyncIOMotorDatabase):
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


async def toggle_review(
    item_id: ObjectId, is_node: bool, data: ReviewBody, db: AsyncIOMotorDatabase
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


async def add_item_class(
    graph_id: ObjectId, item_class: ItemClass, db: AsyncIOMotorDatabase
):
    """Adds a new graph item (node/edge) class"""

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


async def update_item_class(
    graph_id: ObjectId, item_class: ItemClassWithId, db: AsyncIOMotorDatabase
):
    """Updates an existing item class"""
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
