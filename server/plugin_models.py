from pydantic import BaseModel


class InputModel(BaseModel):
    text: str


class OutputModel(BaseModel):
    result: str
