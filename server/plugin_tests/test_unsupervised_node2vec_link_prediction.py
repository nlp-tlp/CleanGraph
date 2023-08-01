from typing import List, Dict
import unittest
import random
from bson import ObjectId

import sys

sys.path.append("..")  # Adds the parent directory to the list of paths


from plugins.unsupervised_node2vec_link_prediction import (
    unsupervised_node2vec_link_prediction,
)


def generate_triples(num: int, seed: int = 0) -> List[Dict[str, str]]:
    """
    Generates an array of triples.

    Parameters:
    - num: The number of triples to generate.

    Returns: A list of dictionaries, each representing a triple.
    """

    random.seed(seed)

    fruits = ["banana", "apple", "orange", "mango", "pear"]
    colors = ["yellow", "red", "orange", "green", "brown"]
    types = ["fruit", "color"]

    triples = []
    for _ in range(num):
        head = random.choice(fruits)
        tail = random.choice(colors)
        triples.append(
            {
                "head": head,
                "head_type": types[0],
                "head_id": str(ObjectId()),
                "tail": tail,
                "tail_type": types[1],
                "tail_id": str(ObjectId()),
            }
        )

    return triples


class TestUnsupervisedNode2VecLinkPrediction(unittest.TestCase):
    def test_unsupervised_node2vec_link_prediction(self):
        triples = generate_triples(num=50)

        result = unsupervised_node2vec_link_prediction(triples, sim_threshold=0.5)

        print(result)


if __name__ == "__main__":
    unittest.main()
