import datetime

from typing import List, Union, Optional

from pydantic import BaseModel


class OntologyBase(BaseModel):
    name: str
    is_entity: bool


class OntologyCreate(OntologyBase):
    pass


class Ontology(OntologyBase):
    id: int
    color: str

    class Config:
        orm_mode = True


class NodeBase(BaseModel):
    name: str
    type: str
    is_active: bool


class Node(NodeBase):
    # Schema is based on D3 data structure
    id: int
    value: Optional[int]  # in/out degree
    color: Optional[str]
    is_active: bool = True
    is_reviewed: bool = False


class NodeUpdate(NodeBase):
    is_reviewed: bool
    type: int


class Link(BaseModel):
    # Schema is based on D3 data structure
    id: int  # This is the rel_id
    type: str
    source: int
    target: int
    is_active: bool = True
    is_reviewed: bool = False
    color: Optional[str]


class TripleCreate(BaseModel):
    subj: str
    subj_type: str
    rel: str
    obj: str
    obj_type: str
    # TODO: Review how to remove *_id from this class as its not necessary and confusing
    # with payload
    subj_id: Optional[int] = None
    obj_id: Optional[int] = None
    rel_id: Optional[int] = None


class Triple(BaseModel):
    id: int
    is_active: bool
    is_reviewed: bool
    subj_id: int
    obj_id: int
    rel_id: int
    rel: str
    rel_color: Optional[str]
    subj: str
    subj_type: str
    subj_color: Optional[str]
    subj_value: Optional[int]
    subj_is_active: Optional[bool]
    subj_is_reviewed: Optional[bool]
    obj: str
    obj_type: str
    obj_color: Optional[str]
    obj_value: Optional[int]
    obj_is_active: Optional[bool]
    obj_is_reviewed: Optional[bool]

    class Config:
        orm_mode = True


class GraphBase(BaseModel):
    name: str
    edges_visible: bool = (
        False  # Indicates whether relations should have label names visible
    )


class GraphCreate(GraphBase):
    pass


class Graph(GraphBase):
    id: int
    created_at: datetime.date
    last_updated: datetime.date
    # start_triples: int
    ontology: List[Ontology]
    nodes: list  # Optional[List[Node]]
    # triples: List[Triple]
    edges_visible: bool

    class Config:
        orm_mode = True


class GraphData(BaseModel):
    nodes: List[Node] = []
    links: List[Link] = []
    neighbours: Optional[dict]


class GraphDataWithFocusNode(GraphData):
    node: Node
    max_triples: int
    reviewed: Optional[float]
