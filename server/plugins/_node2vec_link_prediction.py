from plugin_interface import (
    CompletionModelPluginInferface,
)
from plugin_models import ModelInput, ModelOutput, Suggestion

from typing import List, Dict

import networkx as nx
from node2vec import Node2Vec
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import numpy as np


def node2vec_link_prediction(triples: List[Dict]):
    """

    Link prediction using logistic regression and node2vec graph embeddings.

    TODO: allow parameterisation.
    """

    # Create graph from triples
    G = nx.Graph()
    for t in triples:
        G.add_edge(t["head"], t["tail"])

    # Generate walks
    node2vec = Node2Vec(
        G, dimensions=20, walk_length=16, num_walks=100
    )  # TODO: allow parameterisation.

    # train node2vec model
    n2w_model = node2vec.fit(window=7, min_count=1)  # TODO: parameterise.

    # Create a dictionary mapping each node to its index
    node2index = {node: i for i, node in enumerate(n2w_model.wv.index_to_key)}

    # Prepare positive and negative link samples for training the classifier
    pos_samples = [(edge[0], edge[1], 1) for edge in G.edges]
    neg_samples = [(node[0], node[1], 0) for node in nx.non_edges(G)]
    samples = pos_samples + neg_samples

    # Split samples into features and labels
    X = [
        np.concatenate(
            (
                n2w_model.wv.vectors[node2index[sample[0]]],
                n2w_model.wv.vectors[node2index[sample[1]]],
            )
        )
        for sample in samples
    ]
    y = [sample[2] for sample in samples]

    print("split samples")

    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("created training data")

    # Train logistic regression classifier
    clf = LogisticRegression(random_state=0).fit(X_train, y_train)

    # Predict on the test set
    y_pred = clf.predict(X_test)

    # Print classification report
    print(classification_report(y_test, y_pred))

    return []


class Plugin(CompletionModelPluginInferface):
    name: str = ("Simple Link Prediction",)
    description: str = (
        "Predicts missing links by analysing node semantics and similarity."
    )

    def execute(self, triples: List[Dict]) -> ModelOutput:
        suggestion_output = node2vec_link_prediction(triples=triples)

        return ModelOutput(type="suggestions", data=suggestion_output)
