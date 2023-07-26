from fastapi import HTTPException, status
import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from settings import settings


async def get_db() -> AsyncIOMotorClient:
    """Returns a database client.

    Raises:
        HTTPException: If there is an error connecting to the database.

    Yields:
        AsyncIOMotorClient: A database client.
    """

    # Create a database client
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)

    # Get the database from the client
    db = client[settings.MONGO_DB_NAME]

    try:
        # Yield the database client to the dependent function
        yield db
    except:
        # Log the error and raise an exception
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service unavailable",
        )
    finally:
        # Close the database client
        client.close()
