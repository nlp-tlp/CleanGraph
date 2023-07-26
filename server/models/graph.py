from typing import List, Dict, Optional, Any, Type
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from bson import ObjectId

from models.utils import PyObjectId


class BaseError(BaseModel):
    error_type: str
    error_value: str


class Error(BaseError):
    id: PyObjectId = Field(default_factory=PyObjectId)
    acknowledged: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BaseSuggestion(BaseModel):
    suggestion_type: str
    suggestion_value: str


class Suggestion(BaseSuggestion):
    id: PyObjectId = Field(default_factory=PyObjectId)
    acknowledged: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OutputError(Error):
    item_id: PyObjectId
    is_node: bool
    item_name: str
    item_type: Optional[str]

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class OutputSuggestion(Suggestion):
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Property(BaseModel):
    id: PyObjectId = Field(
        default_factory=PyObjectId,
        description="The id of the property. It's an ObjectId as required by MongoDB.",
    )
    name: str = Field(..., description="The name of the property.")
    value: Any = Field(
        ..., description="The value of the property. It can be of any type."
    )
    value_type: str = Field(
        ...,
        description="The type name of the value. It's automatically filled when a Property is created with the `create` method.",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="The creation date of the property. It's automatically filled with the current UTC datetime when a Property is created.",
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="The update date of the property. It's automatically filled with the current UTC datetime when a Property is created.",
    )

    # @classmethod
    # def create(cls: Type["Property"], name: str, value: Any) -> "Property":
    #     # A class method to create a new Property. It automatically fills the `value_type` with the type name of `value`.
    #     return cls(
    #         name=name,
    #         value=value,
    #         value_type=type(value).__name__,
    #     )


class BaseItem(BaseModel):
    name: Optional[str]  # Not necessary for edges as they are only typed
    # type: Optional[str]  # not necessary for untyped nodes (they will have "names")
    type: Optional[PyObjectId]


class CreateItem(BaseItem):
    color: Optional[str]
    value: int
    properties: List[Property] = []
    errors: List[Error] = []
    suggestions: List[Suggestion] = []
    is_reviewed: bool = False
    is_active: bool = True
    graph_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Item(CreateItem):
    created_at: datetime
    updated_at: datetime


class Node(Item):
    id: PyObjectId = Field(alias="_id")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Edge(Item):
    id: PyObjectId = Field(alias="_id")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class BaseTriple(BaseModel):
    graph_id: str
    source_id: str
    target_id: str
    relation_id: str


class ItemClass(BaseModel):
    name: Optional[str]
    color: str


class OutputItemClass(ItemClass):
    id: PyObjectId = Field(alias="_id")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NodeSizes(Enum):
    small = "small"
    medium = "medium"
    large = "large"


class GraphSettings(BaseModel):
    display_edge_labels: bool = True
    node_size: NodeSizes = NodeSizes.medium
    limit: int = 10

    class Config:
        use_enum_values = True


class GraphColors(BaseModel):
    deactivated: str = "#f44336"
    reviewed: str = "#009688"
    error: str = "#ff9800"
    suggestion: str = "#9c27b0"


class Plugins(BaseModel):
    edm: Optional[str]
    cm: Optional[str]


class Settings(BaseModel):
    display_errors: bool = True
    display_suggestions: bool = True
    graph: GraphSettings = GraphSettings()
    colors: GraphColors = GraphColors()


class BaseGraph(BaseModel):
    name: str
    node_classes: List[str]
    edge_classes: List[str]
    filename: Optional[str]
    plugins: Plugins


class Triple(BaseModel):
    head: str
    head_type: Optional[str]
    head_properties: Optional[Dict]
    head_errors: Optional[Dict]
    relation: str = Field(description="Relation type")
    relation_properties: Optional[Dict]
    relation_errors: Optional[Dict]
    tail: str
    tail_type: Optional[str]
    tail_properties: Optional[Dict]
    tail_errors: Optional[Dict]


class InputGraph(BaseGraph):
    triples: List[Triple]


class CreateGraph(BaseGraph):
    settings: Settings = Settings()
    start_node_count: int
    start_edge_count: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SubGraph(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str = Field(
        description="The name of the subgraphs provided by its central node."
    )
    type: PyObjectId = Field(
        description="The type UUID associated with the subgraph central node"
    )
    value: str = Field(description="The number of triples on the subgraph")
    errors: int = Field(
        default=0, ge=0, description="Number of errors on the entire subgraph"
    )
    suggestions: int = Field(
        default=0, ge=0, description="Number of suggestions on the entire subgraph"
    )
    reviewed_progress: int = Field(ge=0, description="Progress made reviewing subgraph")


class Graph(CreateGraph):
    id: PyObjectId = Field(alias="_id")
    node_classes: List[OutputItemClass]
    edge_classes: List[OutputItemClass]
    subgraphs: List[SubGraph]
    total_errors: int
    total_suggestions: int
    start_node_count: int
    start_edge_count: int

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Graph List View


class SimpleGraph(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Graph for main interface


class Link(BaseModel):
    # Schema is based on D3 data structure
    id: PyObjectId = Field(alias="_id")  # This is the rel_id
    type: PyObjectId
    source: PyObjectId = Field(alias="source")
    target: PyObjectId = Field(alias="target")
    is_active: bool
    is_reviewed: bool
    color: str
    errors: List[Error]
    suggestions: List[Suggestion]
    properties: List[Dict] = []
    value: int

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class GraphData(BaseModel):
    nodes: Dict[str, Node] = {}
    links: Dict[str, Link] = {}
    neighbours: Optional[dict]


class GraphDataWithFocusNode(GraphData):
    central_node_id: str = Field(description="UUID of the subgraphs central node")
    max_triples: int
    reviewed: Optional[float]

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class MergedNode(BaseModel):
    item_modified: bool
    new_node: Node
    old_node_ids: List[str]
    new_subgraph: SubGraph

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Download


class DownloadTriple(BaseModel):
    head: str
    head_type: str
    head_properties: Dict
    head_errors: List
    head_suggestions: List
    relation: str
    relation_properties: Dict
    relation_errors: List
    relation_suggestions: List
    tail: str
    tail_type: str
    tail_properties: Dict
    tail_errors: List
    tail_suggestions: List


class DownloadMeta(BaseModel):
    name: str
    node_classes: List[ItemClass]
    edge_classes: List[ItemClass]
    filename: Optional[str]
    plugins: Plugins
    settings: Settings
    start_node_count: int
    start_edge_count: int
    created_at: datetime
    updated_at: datetime


class GraphDownload(BaseModel):
    meta: DownloadMeta
    data: List[DownloadTriple]
