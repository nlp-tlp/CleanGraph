from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, root_validator


class Acknowledge(BaseModel):
    # TODO: redo semantics, a bit confusing with items being nodes/edges with ids too...
    is_node: bool  # node or edge
    item_id: str
    is_error: bool  # true error false suggestion
    error_or_suggestion_item_id: str  # UUID of error/suggestion id


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


class ItemType(str, Enum):
    node = "node"
    edge = "edge"


class ItemClass(BaseModel):
    is_node: bool
    name: str
    color: str


class ItemClassWithId(ItemClass):
    id: str


class ItemUpdate(BaseModel):
    name: Optional[str]
    type: Optional[str]
    is_reviewed: Optional[bool]
    is_active: Optional[bool]
    properties: Optional[List[Dict[str, Any]]]
    reverse_direction: Optional[bool]


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


class AddItemsBody(BaseModel):
    head_name: str = Field(description="The name of the head node")
    head_type: str = Field(description="The type UUID of the head node")
    edge: str = Field(description="The type UUID of the edge")
    tail_name: str = Field(description="The name of the tail node")
    tail_type: str = Field(description="The type UUID of the tail node")
