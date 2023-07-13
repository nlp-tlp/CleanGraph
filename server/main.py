from typing import List, Tuple
import itertools

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_


import crud
import models
import schemas
from database import SessionLocal, engine
from utils import triples_to_nls, get_node_neighbours

from plugin_manager import PluginManager

plugin_manager = PluginManager()

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = ["http://localhost:3000", "localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    print("Checking for plugins...")
    plugin_manager.load_plugins("./plugins")


@app.get("/plugins/")
def get_plugins():
    """Fetches available plugins for error detection models (edm) and completion models (cm)"""

    plugins = plugin_manager.get_plugins()
    plugin_names = list(plugins.keys())

    if len(plugin_names) > 0:
        return {"edm": plugin_names, "cm": plugin_names}
    return {"edm": [], "cm": []}


# def extract_errors():
#     try:
#         result = plugin.process(text)
#     except Exception as e:
#         print(f"Plugin {plugin.__name__} threw an exception: {e}")


@app.post("/graph/", response_model=schemas.Graph)
def create_graph(
    graph: schemas.GraphCreate,
    ontology: List[schemas.OntologyCreate],
    triples: List[schemas.TripleCreate],
    db: Session = Depends(get_db),
):
    return crud.create_graph(db, graph=graph, ontology=ontology, triples=triples)


@app.get("/graphs/", response_model=List[schemas.Graph])
def read_graphs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    graphs = crud.get_graphs(db, skip=skip, limit=limit)
    return graphs


@app.get("/graphs/{graph_id}", response_model=schemas.Graph)
def read_graph(graph_id: int, db: Session = Depends(get_db)):
    db_graph = crud.get_graph(db, graph_id=graph_id)
    if db_graph is None:
        raise HTTPException(status_code=404, detail="Graph not found")
    return db_graph


@app.get("/graphs/{graph_id}/{node_id}", response_model=schemas.GraphDataWithFocusNode)
def read_graph_data(
    graph_id: int,
    node_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """
    Samples subgraphs based on graph_id and node_id.
    """

    triples, max_triples, node = crud.get_graph_triples(
        db, graph_id=graph_id, node_id=node_id, skip=skip, limit=limit
    )

    nodes, links = triples_to_nls(triples)
    neighbours = get_node_neighbours(nodes=nodes, links=links)

    reviewed = (
        db.query(models.Triple)
        .filter(
            or_(
                models.Triple.subj_id == node_id,
                models.Triple.obj_id == node_id,
            ),
            models.Triple.is_reviewed,
        )
        .all()
    )

    review_prog = len(reviewed) / max_triples

    return schemas.GraphDataWithFocusNode(
        nodes=nodes,
        links=links,
        neighbours=neighbours,
        node=node,
        max_triples=max_triples,
        reviewed=review_prog,
    )


@app.get("/sample/{graph_id}", response_model=schemas.GraphDataWithFocusNode)
def sample_graph_data(
    graph_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """
    Randomly samples subgraph. Used for first graph loaded on UI.
    """

    triples, max_triples, node = crud.get_graph_triples(
        db, graph_id=graph_id, skip=skip, limit=limit, do_sample=True
    )

    nodes, links = triples_to_nls(triples)
    neighbours = get_node_neighbours(nodes=nodes, links=links)

    reviewed = (
        db.query(models.Triple)
        .filter(
            or_(
                models.Triple.subj_id == node.id,
                models.Triple.obj_id == node.id,
            ),
            models.Triple.is_reviewed,
        )
        .all()
    )

    review_prog = len(reviewed) / max_triples

    return schemas.GraphDataWithFocusNode(
        nodes=nodes,
        links=links,
        neighbours=neighbours,
        node=node,
        max_triples=max_triples,
        reviewed=review_prog,
    )


@app.delete("/graphs/{graph_id}")
def delete_graph(graph_id: int, db: Session = Depends(get_db)):
    # https://stackoverflow.com/questions/58546833/sql-alchemy-cascade-delete-what-am-i-missing
    db_graph = db.query(models.Graph).filter(models.Graph.id == graph_id).one()
    db.delete(db_graph)
    db.commit()
    return "Deleted graph"


@app.patch("/graphs/merge/{graph_id}/{node_id}")
def merge_graph(
    node_id: int,
    merge_node_ids: List[int],
    db: Session = Depends(get_db),
):
    """Merges subgraphs. all triples from `merge_node_ids` will be merged into `node_id`.
    Merged nodes will be removed from the database.

    Note:
        - Any triples that will become self-referential are ignored.
        - Any duplicate triples will be removed.
    """

    triples = (
        db.query(models.Triple)
        .filter(
            or_(
                models.Triple.subj_id.in_(merge_node_ids),
                models.Triple.obj_id.in_(merge_node_ids),
            )
        )
        .all()
    )

    print("triples to merge", len(triples))

    new_triples = 0
    for t in triples:
        if (t.subj_id in merge_node_ids) & (t.obj_id in merge_node_ids):
            # Self-referential triple as subj/obj will go to `node_id`
            pass
        else:
            new_triples += 1
            if t.subj_id in merge_node_ids:
                db.query(models.Triple).filter(models.Triple.id == t.id).update(
                    {"subj_id": node_id}
                )
            else:
                db.query(models.Triple).filter(models.Triple.id == t.id).update(
                    {"obj_id": node_id}
                )

    # Delete merged nodes
    db.query(models.Node).filter(models.Node.id.in_(merge_node_ids)).delete()

    # Update new node with degree with additional triples
    node_to_update = db.query(models.Node).filter(models.Node.id == node_id).first()
    node_to_update.value = (
        node_to_update.value + new_triples
    )  # TODO: This fails to increment correctly if merged_nodes are connected to the `node_id`

    db.commit()

    return f"Merged {len(merge_node_ids)+1}"


@app.patch("/graphs/node/review/{node_id}")
def review_graph(node_id: int, is_reviewed: bool, db: Session = Depends(get_db)):
    """Sets state of given node, its relations and 1-hop neighbours reviewed state."""

    print(node_id, is_reviewed)

    triples = (
        db.query(models.Triple)
        .filter(or_(models.Triple.subj_id == node_id, models.Triple.obj_id == node_id))
        .all()
    )

    # print(triples)

    stranded_candidate_ids = set(
        itertools.chain.from_iterable([[t.subj_id, t.obj_id] for t in triples])
    )

    # Remove focus node
    stranded_candidate_ids = [nId for nId in stranded_candidate_ids if nId != node_id]

    # print(stranded_candidate_ids)

    # Check whether nodes are stranded if focus node is deactivated; these node are not connected to any other triples or
    # the other triples are deactivated already
    stranded_ids = []
    for nId in stranded_candidate_ids:
        candidate_triples = (
            db.query(models.Triple)
            .filter(
                and_(
                    models.Triple.subj_id != node_id,
                    models.Triple.obj_id != node_id,
                    or_(models.Triple.subj_id == nId, models.Triple.obj_id == nId),
                    models.Triple.is_active == True,
                )
            )
            .all()
        )
        # print(f"Candidate Node ID: {nId} - Triples: {len(candidate_triples)}")

        if len(candidate_triples) == 0:
            stranded_ids.append(nId)

    # print("Number of stranded_ids", len(stranded_ids))

    # Set `is_active` state on nodes and triples
    node_ids_to_update = stranded_ids + [node_id]

    for nId in node_ids_to_update:
        db.query(models.Node).filter(models.Node.id == nId).update(
            {"is_reviewed": is_reviewed}
        )

    for t in triples:
        db.query(models.Triple).filter(models.Triple.id == t.id).update(
            {"is_reviewed": is_reviewed}
        )

    db.commit()
    return {"triple_ids": [t.id for t in triples], "nodes_ids": node_ids_to_update}


@app.patch("/graphs/relation/change-direction/{triple_id}")
def change_triple_direction(triple_id: int, db: Session = Depends(get_db)):
    """Changes directionality of relation between two nodes"""

    triple = db.query(models.Triple).filter(models.Triple.id == triple_id).first()
    obj_id = triple.obj_id
    subj_id = triple.subj_id
    triple.subj_id = obj_id
    triple.obj_id = subj_id
    db.commit()
    return "Changed direction"


@app.patch("/graphs/relation/deactivate/{triple_id}")
def deactivate_triple(triple_id: int, is_active: bool, db: Session = Depends(get_db)):
    """Actives/deactivates relation between nodes"""

    db.query(models.Triple).filter(models.Triple.id == triple_id).update(
        {"is_active": is_active}
    )
    db.commit()
    return "Updated triple"


@app.patch("/graphs/node/deactivate/{node_id}")
def deactivate_node(node_id: int, is_active: bool, db: Session = Depends(get_db)):
    """Actives/deactivates a given node and its stranded neighbours (limited to 1-hop distance). This includes relationships.

    TODO: Update iterative updates to use bulk update method.
    """

    triples = (
        db.query(models.Triple)
        .filter(or_(models.Triple.subj_id == node_id, models.Triple.obj_id == node_id))
        .all()
    )

    # print(triples)

    stranded_candidate_ids = set(
        itertools.chain.from_iterable([[t.subj_id, t.obj_id] for t in triples])
    )

    # Remove focus node
    stranded_candidate_ids = [nId for nId in stranded_candidate_ids if nId != node_id]

    # print(stranded_candidate_ids)

    # Check whether nodes are stranded if focus node is deactivated; these node are not connected to any other triples or
    # the other triples are deactivated already
    stranded_ids = []
    for nId in stranded_candidate_ids:
        candidate_triples = (
            db.query(models.Triple)
            .filter(
                and_(
                    models.Triple.subj_id != node_id,
                    models.Triple.obj_id != node_id,
                    or_(models.Triple.subj_id == nId, models.Triple.obj_id == nId),
                    models.Triple.is_active == True,
                )
            )
            .all()
        )
        # print(f"Candidate Node ID: {nId} - Triples: {len(candidate_triples)}")

        if len(candidate_triples) == 0:
            stranded_ids.append(nId)

    # print("Number of stranded_ids", len(stranded_ids))

    # Set `is_active` state on nodes and triples
    node_ids_to_update = stranded_ids + [node_id]

    for nId in node_ids_to_update:
        db.query(models.Node).filter(models.Node.id == nId).update(
            {"is_active": is_active}
        )

    for t in triples:
        db.query(models.Triple).filter(models.Triple.id == t.id).update(
            {"is_active": is_active}
        )

    db.commit()
    return {"triple_ids": [t.id for t in triples], "nodes_ids": node_ids_to_update}


@app.patch("/graphs/node/{node_id}")
def update_node(node_id: int, node: schemas.NodeUpdate, db: Session = Depends(get_db)):
    """Updates node information - `name` and `type`"""
    # NOTE: Couldn't get node.dict() to work to automatically unpack schema into Node model...
    db.query(models.Node).filter(models.Node.id == node_id).update(
        {"name": node.name, "type_id": node.type}
    )

    db.commit()
    return "Updated node"
