from typing import List
import itertools

from sqlalchemy.orm import Session, load_only
from sqlalchemy import or_

import models
import schemas
from utils import get_random_color


def create_graph(
    db: Session,
    graph: schemas.Graph,
    ontology: List[schemas.Ontology],
    triples: List[schemas.Triple],
):
    """
    Creates graph and associated ontologies, and then populates graph with triples.
    """
    # Create graph object
    db_graph = models.Graph(name=graph.name)
    db.add(db_graph)
    db.commit()
    db.refresh(db_graph)

    # print("db id:", db_graph.id)

    # TODO: Drop duplicate triplets before progressing

    # Extract subj/obj classes from triplets (may have classes not explicitly specified in ontology)
    entity_classes = list(
        set(itertools.chain.from_iterable([[t.subj_type, t.obj_type] for t in triples]))
    )
    # print("entity_classes", entity_classes)

    # Extract rel classes from triplets (may have classes not explicitly specified in ontology)
    relation_classes = list(set([t.rel for t in triples]))

    # print("relation_classes", relation_classes)

    # Extend ontology object (if edge/relation does not exist)
    entity_ontology = set([o.name for o in ontology if o.is_entity])
    relation_ontology = set([o.name for o in ontology if not o.is_entity])
    for ec in entity_classes:
        entity_ontology.add(ec)
    for rc in relation_classes:
        relation_ontology.add(rc)

    # print("entity_ontology", entity_ontology)
    # print("relation_ontology", relation_ontology)

    merged_ontology = [
        {"name": name, "is_entity": True} for name in entity_ontology
    ] + [{"name": name, "is_entity": False} for name in relation_ontology]

    # print("merged_ontology", merged_ontology)

    # Create ontologies
    db_ontology = [
        models.Ontology(**item, graph_id=db_graph.id, color=get_random_color())
        for item in merged_ontology
    ]
    db.bulk_save_objects(
        db_ontology, return_defaults=True
    )  # Supposedly has a performance loss returning defaults...
    db.commit()

    entity_map = {o.name: o.id for o in db_ontology if o.is_entity}

    # Create nodes (these hold name/class information); these are unique.
    nodes = list(
        set(
            itertools.chain.from_iterable(
                [[(t.subj, t.subj_type), (t.obj, t.obj_type)] for t in triples]
            )
        )
    )

    print("nodes", nodes)

    # Find node degree based on neighbouring links
    # TODO: REFACTOR THIS AS ITS A DUPLICATE OF WHATS IN `utils.py`
    links = [
        (idx, t.subj, t.subj_type, t.obj, t.obj_type) for idx, t in enumerate(triples)
    ]

    neighbours = {}
    for node in nodes:
        neighbours[node] = {"nodes": set(), "links": set()}

    for link in links:
        link_id, subj, subj_type, obj, obj_type = link
        a = (subj, subj_type)
        b = (obj, obj_type)

        neighbours[a]["nodes"].add(b)
        neighbours[b]["nodes"].add(a)
        neighbours[a]["links"].add(link_id)
        neighbours[b]["links"].add(link_id)

    neighbours = {
        k: {"nodes": list(v["nodes"]), "links": list(v["links"])}
        for k, v in neighbours.items()
    }

    # print(neighbours)
    # ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    db_nodes = [
        models.Node(
            name=n[0],
            type_id=entity_map[n[1]],
            graph_id=db_graph.id,
            value=len(neighbours[n]["links"]),
        )
        for n in nodes
    ]
    db.bulk_save_objects(db_nodes, return_defaults=True)
    db.commit()

    print("db_nodes", db_nodes)

    # Create node mapping
    node_map = {(n.name, n.type_id): n.id for n in db_nodes}
    print("node_map", node_map)

    # Create map of ontology to map into triplets
    relation_map = {o.name: o.id for o in db_ontology if not o.is_entity}
    # print("entity_map", entity_map)
    # print("relation_map", relation_map)

    # Convert subj/obj/rel types to ontology ids
    updated_triples = []
    for t in triples:
        t.subj_id = node_map[(t.subj, entity_map[t.subj_type])]
        t.obj_id = node_map[(t.obj, entity_map[t.obj_type])]
        t.rel_id = relation_map[t.rel]

        updated_triples.append(t)

    # Add triples
    db_triples = [
        # **t.dict()
        models.Triple(
            subj_id=t.subj_id,
            obj_id=t.obj_id,
            rel_id=t.rel_id,
            is_active=True,
            graph_id=db_graph.id,
        )
        for t in updated_triples
    ]
    db.bulk_save_objects(db_triples)
    db.commit()

    return db_graph


def get_graph(db: Session, graph_id: int):

    graph = db.query(models.Graph).filter(models.Graph.id == graph_id).first()

    print(graph.nodes[0])

    return graph


def get_graphs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Graph).offset(skip * limit).limit(limit).all()


def get_graph_triples(
    db: Session,
    graph_id: int,
    node_id: int = None,
    skip: int = 0,
    limit: int = 10,
    do_sample: bool = False,
):
    """
    Args
        do_sample : samples first node id from the graph triples.
                This is used predominately when the graph is first loaded as to not overload the UI.
    """

    if do_sample:
        node = db.query(models.Node).filter(models.Node.graph_id == graph_id).first()
        node_id = node.id
    else:
        node = db.query(models.Node).filter(models.Node.id == node_id).first()

    max_triples = (
        db.query(models.Triple)
        .filter(
            models.Triple.graph_id == graph_id,
            or_(models.Triple.subj_id == node_id, models.Triple.obj_id == node_id),
        )
        .count()
    )

    print("max_triples", max_triples)

    triples = (
        db.query(models.Triple)
        .filter(
            models.Triple.graph_id == graph_id,
            or_(models.Triple.subj_id == node_id, models.Triple.obj_id == node_id),
        )
        .offset(skip * limit)
        .limit(limit)
        .all()
    )

    # Destructuring this way to get access to Node objects is dumn; TODO: review.
    triples = [
        schemas.Triple(
            id=t.id,
            subj_id=t.subj_id,
            obj_id=t.obj_id,
            rel_id=t.rel_id,
            rel=t.rel.name,
            rel_color=t.rel.color,
            subj=t.subj.name,
            subj_type=t.subj.type.name,
            subj_color=t.subj.type.color,
            subj_value=t.subj.value,
            subj_is_active=t.subj.is_active,
            subj_is_reviewed=t.subj.is_reviewed,
            obj=t.obj.name,
            obj_type=t.obj.type.name,
            obj_color=t.obj.type.color,
            obj_value=t.obj.value,
            obj_is_active=t.obj.is_active,
            obj_is_reviewed=t.obj.is_reviewed,
            is_active=t.is_active,
            is_reviewed=t.is_reviewed,
        )
        for t in triples
    ]

    return (
        triples,
        max_triples,
        schemas.Node(
            id=node.id,
            name=node.name,
            type=node.type.name,
            value=node.value,
            color=node.type.color,
        ),
    )
