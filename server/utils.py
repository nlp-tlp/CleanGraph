from typing import List, Tuple
import random

import schemas


def get_random_color():
    """Samples random color"""

    r = lambda: random.randint(0, 255)
    return "#{:02x}{:02x}{:02x}".format(r(), r(), r())


def triples_to_nls(
    triples: List[schemas.Triple],
) -> Tuple[List[schemas.Node], List[schemas.Link]]:
    """
    Convert triplets into set of nodes/links (nls) for UI visualisation
    """

    nodes = []
    links = []
    for t in triples:
        nodes.extend(
            [
                schemas.Node(
                    id=t.subj_id,
                    name=t.subj,
                    type=t.subj_type,
                    color=t.subj_color,
                    value=t.subj_value,
                    is_active=t.subj_is_active,
                    is_reviewed=t.subj_is_reviewed,
                ),
                schemas.Node(
                    id=t.obj_id,
                    name=t.obj,
                    type=t.obj_type,
                    color=t.obj_color,
                    value=t.obj_value,
                    is_active=t.obj_is_active,
                    is_reviewed=t.obj_is_reviewed,
                ),
            ]
        )
        # NOTE: Links do not have their own row `id`, here we're using the triple `id` as a proxy.
        links.append(
            schemas.Link(
                id=t.id,
                type=t.rel,
                source=t.subj_id,
                target=t.obj_id,
                color=t.rel_color,
                is_active=t.is_active,
                is_reviewed=t.is_reviewed,
            )
        )

    # Remove duplicate nodes
    # src: https://stackoverflow.com/a/9427216
    nodes = [schemas.Node(**dict(t)) for t in {tuple(n.dict().items()) for n in nodes}]

    # print("t_to_nls nodes", nodes)

    return nodes, links


def get_node_neighbours(nodes: List[schemas.Node], links: List[schemas.Link]) -> dict:
    """Creates mapping of nodes to neighbouring nodes/links"""

    print("nodes", nodes, "links", links)

    neighbours = {}
    for node in nodes:
        neighbours[node.id] = {"nodes": set(), "links": set()}

    for link in links:
        a = link.source
        b = link.target

        neighbours[a]["nodes"].add(b)
        neighbours[b]["nodes"].add(a)
        neighbours[a]["links"].add(link.id)
        neighbours[b]["links"].add(link.id)

    neighbours = {
        k: {"nodes": list(v["nodes"]), "links": list(v["links"])}
        for k, v in neighbours.items()
    }

    return neighbours
