from plugin_interface import (
    CompletionModelPluginInferface,
)
from plugin_models import ModelInput, ModelOutput, Suggestion
import models.graph as graph_model

from typing import List, Dict

import networkx as nx
from node2vec import Node2Vec
from sklearn.metrics.pairwise import cosine_similarity


def unsupervised_node2vec_link_prediction(
    triples: List[Dict], sim_threshold: float = 0.99
):
    """
    Unsupervised link prediction using node2vec graph embeddings. Returns links that may exist between two nodes.
    """

    # Create graph from triples, with type information as node attributes
    G = nx.Graph()
    node_types = {}
    node_ids = {}
    for t in triples:
        G.add_edge(t["head"], t["tail"])
        node_types[t["head"]] = t["head_type"]
        node_types[t["tail"]] = t["tail_type"]
        node_ids[t["head"]] = t["head_id"]
        node_ids[t["tail"]] = t["tail_id"]

    nx.set_node_attributes(G, node_types, "type")
    nx.set_node_attributes(G, node_ids, "id")

    # Initialize Node2Vec model
    node2vec = Node2Vec(G, dimensions=64, walk_length=30, num_walks=200, workers=4)

    # Fit Node2Vec model
    model = node2vec.fit(window=10, min_count=1, batch_words=4)
    # print("model trained")

    # Get node embeddings
    embeddings = model.wv
    # print("got embeddings")

    # Perform link prediction
    def predict_link(node1, node2, threshold=sim_threshold) -> bool:
        return (
            cosine_similarity(
                embeddings[node1].reshape(1, -1), embeddings[node2].reshape(1, -1)
            )
            > threshold
        )

    # Get all nodes
    nodes = list(G.nodes)

    # Predict link between all pairs of nodes (excluding pairs with the same name and those already in the graph)
    predicted_links_set = set()
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if (
                nodes[i] != nodes[j]
                and not G.has_edge(nodes[i], nodes[j])
                and G.nodes[nodes[i]]["type"] != G.nodes[nodes[j]]["type"]
            ):
                if predict_link(nodes[i], nodes[j]):
                    link_tuple = tuple(
                        sorted(
                            [
                                (
                                    G.nodes[nodes[i]]["id"],
                                    nodes[i],
                                    G.nodes[nodes[i]]["type"],
                                ),
                                (
                                    G.nodes[nodes[j]]["id"],
                                    nodes[j],
                                    G.nodes[nodes[j]]["type"],
                                ),
                            ]
                        )
                    )
                    predicted_links_set.add(link_tuple)

    predicted_links = [
        {
            "head_id": l[0][0],
            "head": l[0][1],
            "head_type": l[0][2],
            "tail_id": l[1][0],
            "tail": l[1][1],
            "tail_type": l[1][2],
        }
        for l in predicted_links_set
    ]

    print(f"Predicted {len(predicted_links)} new links.")
    print("predicted_links sample:", predicted_links[:10])

    suggestions = [
        Suggestion(
            suggestion_type="Link Prediction",
            suggestion_value=f'Link may exist between this node and "{pl["tail"]}" [{pl["tail_type"]}]',
            id=pl["head_id"],
            is_node=True,
            action=graph_model.UpdateAction(
                data=graph_model.SuggestionUpdateActionData(
                    head_id=pl["head_id"],
                    tail_id=pl["tail_id"],
                    edge_type="hello_world",
                )
            ),
        )
        for pl in predicted_links
    ]

    return suggestions


class Plugin(CompletionModelPluginInferface):
    name: str = ("Simple Link Prediction",)
    description: str = (
        "Predicts missing links by analysing node semantics and similarity."
    )

    def execute(self, triples: List[Dict]) -> ModelOutput:
        suggestion_output = unsupervised_node2vec_link_prediction(triples=triples)

        return ModelOutput(type="suggestions", data=suggestion_output)
