from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
import sys

from routers import plugin, graph, errors, suggestions


class LoguruMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Request: {request.method} {request.url.path}")
        response = await call_next(request)
        logger.info(f"Response: {response.status_code}")
        return response


def set_logger():
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | <level>{message}</level>",
        level="INFO",
        enqueue=True,
    )
    logger.add(
        "logfiles/info.log",
        rotation="500 MB",
        encoding="utf-8",
        level="INFO",
        enqueue=True,
    )
    logger.add(
        "logfiles/debug.log",
        rotation="500 MB",
        encoding="utf-8",
        level="DEBUG",
        enqueue=True,
    )
    logger.add(
        "logfiles/error.log",
        rotation="500 MB",
        encoding="utf-8",
        level="ERROR",
        enqueue=True,
    )


set_logger()


origins = ["http://localhost:3000", "localhost:3000"]

app = FastAPI(title="CleanGraph API", version="1.0.0", dependencies=[])

app.add_middleware(LoguruMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph.router)
app.include_router(errors.router)
app.include_router(suggestions.router)
app.include_router(plugin.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
