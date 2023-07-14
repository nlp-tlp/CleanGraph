"""
db_manager.py

A script to manage MongoDB collections using Typer CLI.
"""
import asyncio
from typing import NoReturn

import typer
import motor.motor_asyncio
from motor.core import AgnosticDatabase

from settings import settings

app = typer.Typer()


def get_db() -> AgnosticDatabase:
    """Establish a connection to the database and return the database object.

    Returns:
        motor.motor_asyncio.AsyncIOMotorDatabase: The database object.
    """
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    return client[settings.MONGO_DB_NAME]


@app.command()
def drop_all_collections() -> NoReturn:
    """Drops all collections in the MongoDB database."""
    asyncio.run(drop_all_collections_async())


async def drop_all_collections_async() -> NoReturn:
    """Asynchronous task to drop all collections in the MongoDB database.

    This function will asynchronously drop all collections in the database.
    Any errors that occur during the operation will be caught and printed.
    """
    db = get_db()
    try:
        for collection_name in await db.list_collection_names():
            await db[collection_name].drop()
        typer.echo(
            f"All collections in database {settings.MONGO_DB_NAME} dropped successfully!"
        )
    except Exception as e:
        typer.echo(f"An error occurred: {e}")


if __name__ == "__main__":
    """Entry point of the script. When run directly, this script will initiate the Typer CLI."""
    app()
