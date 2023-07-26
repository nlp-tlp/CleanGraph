from typing import List, Union, Optional, Dict
from pydantic import BaseModel
from enum import Enum

from models.graph import Triple, BaseSuggestion, BaseError


class ModelTriple(Triple):
    head_properties: Optional[List[Dict]]
    head_id: str
    relation_properties: Optional[List[Dict]]
    relation_id: str
    tail_properties: Optional[List[Dict]]
    tail_id: str


class ModelInput(BaseModel):
    triples: List[Triple]


class Error(BaseError):
    id: str
    is_node: bool


class Suggestion(BaseSuggestion):
    id: str
    is_node: bool


class ErrorsOutput(List[Error]):
    pass


class SuggestionsOutput(List[Suggestion]):
    pass


class OutputType(str, Enum):
    errors = "errors"
    suggestions = "suggestions"


class ModelOutput(BaseModel):
    type: OutputType
    data: Union[ErrorsOutput, SuggestionsOutput]
