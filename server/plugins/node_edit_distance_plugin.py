from plugin_interface import (
    ErrorDetectionModelPluginInterface,
)
from plugin_models import ModelInput, ModelOutput, Error

import Levenshtein
from typing import List, Dict, Tuple, Set
from collections import defaultdict
import itertools


def node_edit_distance(triples: List[Dict], max_distance: int = 1) -> List[Dict]:
    """Identifies nodes with similar names using Levenshtein edit distance. Used for detecting potential typographical errors, synonyms or alternative spellings."""

    nodes = []
    for triple in triples:
        nodes.extend(
            [
                {"name": triple["head"], "id": triple["head_id"]},
                {"name": triple["tail"], "id": triple["tail_id"]},
            ]
        )

    errors = []

    # Compare all names to each other
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if (
                nodes[i]["id"] != nodes[j]["id"]
                and Levenshtein.distance(nodes[i]["name"], nodes[j]["name"])
                <= max_distance
            ):
                # If the names are similar, add them to the errors list
                errors.append(
                    {
                        "id": nodes[i]["id"],
                        "name": nodes[i]["name"],
                        "close_to": {
                            "id": nodes[j]["id"],
                            "name": nodes[j]["name"],
                        },
                    }
                )
                errors.append(
                    {
                        "id": nodes[j]["id"],
                        "name": nodes[j]["name"],
                        "close_to": {
                            "id": nodes[i]["id"],
                            "name": nodes[i]["name"],
                        },
                    }
                )

    # TODO: Improve error complexity to store information in the future. Atm just stringifying.

    output_errors = [
        Error(
            id=err["id"],
            error_type="Edit Distance Error",
            error_value=f'{err["name"]} is close to {err["close_to"]["name"]}',
            is_node=True,
        )
        for err in errors
    ]

    return output_errors


def simple_node_edit_distance(triples: List[Dict], max_distance: int = 1) -> List[Dict]:
    """
    Identifies nodes with similar names using Levenshtein edit distance - does not provide any information except the names that were detected as similar.
    Used for detecting potential typographical errors, synonyms or alternative spellings.
    """
    nodes = group_nodes_by_name_type(triples)
    errors = find_similar_nodes(nodes, max_distance)
    output_errors = format_errors(errors, nodes)

    return output_errors


def group_nodes_by_name_type(triples: List[Dict]) -> Dict[Tuple[str, str], List[str]]:
    nodes = defaultdict(list)
    for triple in triples:
        nodes[(triple["head"], triple["head_type"])].append(triple["head_id"])
        nodes[(triple["tail"], triple["tail_type"])].append(triple["tail_id"])

    return nodes


def find_similar_nodes(
    nodes: Dict[Tuple[str, str], List[str]], max_distance: int
) -> Dict[Tuple[str, str], Set[Tuple[str, str]]]:
    unique_nodes = list(nodes.keys())
    errors = defaultdict(set)

    # Compare all names to each other
    for i, node1 in enumerate(unique_nodes):
        for node2 in unique_nodes[i + 1 :]:
            if Levenshtein.distance(node1[0], node2[0]) <= max_distance:
                errors[node1].add(node2)
                errors[node2].add(node1)

    return errors


def format_errors(
    errors: Dict[Tuple[str, str], Set[Tuple[str, str]]],
    nodes: Dict[Tuple[str, str], List[str]],
) -> List[Dict]:
    _errors = defaultdict(list)

    # Align errors with ids
    for key, value in errors.items():
        node_ids = nodes[key]
        for node_id in node_ids:
            _errors[node_id].extend(f'Name close to "{v[0]}" [{v[1]}]' for v in value)

    output_errors = [
        Error(
            **{
                "id": k,
                "error_type": "Edit Distance Error",
                "error_value": e,
                "is_node": True,
            }
        )
        for k, v in _errors.items()
        for e in v
    ]

    return output_errors


class Plugin(ErrorDetectionModelPluginInterface):
    name: str = "Node Edit Distance"
    description: str = (
        "Detects similar nodes via their name using Levenshtein distance."
    )

    def execute(self, triples: List[Dict]) -> ModelOutput:
        error_output = simple_node_edit_distance(triples=triples)

        return ModelOutput(type="errors", data=error_output)
