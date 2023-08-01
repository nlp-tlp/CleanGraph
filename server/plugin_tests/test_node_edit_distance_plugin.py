import unittest
from typing import Dict, List, Tuple, Set
from collections import defaultdict

import sys

sys.path.append("..")  # Adds the parent directory to the list of paths


from plugins.node_edit_distance_plugin import simple_node_edit_distance


class TestEditDistance(unittest.TestCase):
    def test_simple_node_edit_distance(self):
        triples = [
            {
                "head": "apple",
                "head_type": "fruit",
                "head_id": "1",
                "tail": "green",
                "tail_type": "color",
                "tail_id": "2",
            },
            {
                "head": "appple",
                "head_type": "fruit",
                "head_id": "3",
                "tail": "red",
                "tail_type": "color",
                "tail_id": "4",
            },
            {
                "head": "appple",
                "head_type": "fruit",
                "head_id": "3",
                "tail": "blue",
                "tail_type": "color",
                "tail_id": "7",
            },
            {
                "head": "banana",
                "head_type": "fruit",
                "head_id": "5",
                "tail": "yellow",
                "tail_type": "color",
                "tail_id": "6",
            },
        ]

        result = simple_node_edit_distance(triples)

        print([r.dict() for r in result])
        print(len(result))

        # You can adjust this part depending on what you expect to get
        # expected_result = [
        #     Error(id='1', error_type='Edit Distance Error', error_value='Name close to "appple" [fruit]', is_node=True, action=graph_model.UpdateAction(item_name="hello", item_type="world")),
        #     Error(id='3', error_type='Edit Distance Error', error_value='Name close to "apple" [fruit]', is_node=True, action=graph_model.UpdateAction(item_name="hello", item_type="world"))
        # ]

        # self.assertEqual(result, expected_result)


if __name__ == "__main__":
    unittest.main()
