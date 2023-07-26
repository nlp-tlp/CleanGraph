from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import plugin, graph, errors

origins = ["http://localhost:3000", "localhost:3000"]

app = FastAPI(title="CleanGraph API", version="1.0.0", dependencies=[])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph.router)
app.include_router(errors.router)
app.include_router(plugin.router)
