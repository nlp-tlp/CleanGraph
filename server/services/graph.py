from motor.motor_asyncio import AsyncIOMotorDatabase
import traceback

from models import graph as graph_model


async def create_insert_nodes():
    pass


async def create_insert_edges():
    pass


async def create_insert_triples():
    pass


async def execute_error_detection_models():
    """Executes a set of models"""
    pass


async def create_graph(graph: graph_model.InputGraph, db: AsyncIOMotorDatabase):
    """
    This function creates a graph in the database.

    Note
    ----
    It also executes error detection (edm) and completion (cm) plugins (if specified).
    """

    # Exception Chaining...
    # try:
    #     process_data(data)
    # except Exception as e:
    #     raise RuntimeError("Data processing failed") from e

    try:
        pass
    except:
        traceback.print_exc()
