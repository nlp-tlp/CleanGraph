from typing import List, Dict, Union, Any
import random
import string
import collections

from models import graph as graph_model


def generate_high_contrast_colors(n: int) -> List[str]:
    """
    Generate a list of n high-contrast colors in hexadecimal format.
    The function generates colors by selecting points evenly spaced around a color wheel,
    then converting those points from HSV (Hue, Saturation, Value) color space to RGB color space.
    Colors close to black and white are avoided by restricting the range of each RGB component.

    Args:
        n (int): Number of high contrast colors to generate

    Returns:
        List[str]: List of n high-contrast colors in hexadecimal format
    """
    import colorsys

    colors = []
    MIN_VAL, MAX_VAL = 85, 230

    for i in range(n):
        hue = i / n
        saturation = 1.0
        value = MAX_VAL if i % 2 == 0 else MIN_VAL

        r, g, b = [
            int(x * 255) for x in colorsys.hsv_to_rgb(hue, saturation, value / 255.0)
        ]
        colors.append("#%02x%02x%02x" % (r, g, b))

    return colors


def gen_random_errors() -> List[graph_model.Error]:
    # Generate a random number for the list size
    num_errors = random.randint(0, 5)  # Change upper bound as desired

    # Create a list of errors
    errors = [
        graph_model.Error(error_type="hello", error_value="world")
        for _ in range(num_errors)
        if random.random() > 0.5  # Only generate an error half the time
    ]

    return errors


def gen_random_suggestions() -> List[graph_model.Suggestion]:
    # Generate a random number for the list size
    num_suggestions = random.randint(0, 5)  # Change upper bound as desired

    # Create a list of suggestions
    suggestions = [
        graph_model.Suggestion(suggestion_type="hello", suggestion_value="world")
        for _ in range(num_suggestions)
        if random.random() > 0.5  # Only generate an suggestion half the time
    ]

    return suggestions


def gen_random_properties() -> Dict[str, Union[str, int, bool, float]]:
    """
    Generate a dictionary with a random number of entries (between 0 and 10), where each key
    is a unique random string and the value is either a random number, a random string,
    a boolean, or a float.

    Returns:
        Dict[str, Union[str, int, bool, float]]: Randomly generated dictionary
    """

    dict_size = random.randint(0, 10)

    key_list = [
        "".join(random.choices(string.ascii_lowercase, k=5)) for _ in range(dict_size)
    ]
    value_list = [
        random.choice(
            [
                random.randint(0, 100),
                "".join(random.choices(string.ascii_lowercase, k=5)),
                random.random(),  # float
                random.choice([True, False]),  # bool
            ]
        )
        for _ in range(dict_size)
    ]

    properties = [
        graph_model.Property(name=_key, value=_value, value_type=type(_value).__name__)
        for _key, _value in zip(key_list, value_list)
    ]

    return properties


def flatten_nested_dict(d: Dict[str, Any], parent_key="", sep=".") -> Dict[str, Any]:
    """
    Flatten a nested dictionary by concatenating nested keys with a dot.
    For example, given the input:
    {
        'a': {
            'b': 1,
            'c': {
                'd': 2
            }
        },
        'e': 3
    }
    The output will be:
    {
        'a.b': 1,
        'a.c.d': 2,
        'e': 3
    }

    Arguments
    ---------
    d: The input dictionary, potentially nested.
    parent_key: The string to prepend to dictionary's keys.
    sep: The separator between nested keys.

    Returns
    -------
    A new dictionary with the same data as 'd', but with no nested dictionaries and
    with compound string keys for nested fields.

    Notes
    -----
    In MongoDB, updating a nested field requires using 'dot notation'. This function
    takes a dictionary that potentially contains nested dictionaries and returns a new
    dictionary with no nested dictionaries. Instead, the keys in the output dictionary
    are compound strings that concatenate the keys from the input dictionary,
    effectively mimicking the 'dot notation' required by MongoDB to reach into nested
    fields. This is useful when the fields to be updated in the database document
    are not known in advance or are nested at various levels.

    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, collections.MutableMapping):
            items.extend(flatten_nested_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def concatenate_arrays(
    array1: List[Dict[str, str]], array2: List[Dict[str, str]]
) -> List[Dict[str, str]]:
    """
    Concatenates two lists of dictionaries, giving precedence to the first list's elements
    when there are duplicate 'name' and 'value_type' pairs.

    Args:
        array1: The first list of dictionaries. Each dictionary has the keys 'name', 'value', 'value_type'.
        array2: The second list of dictionaries. Each dictionary has the keys 'name', 'value', 'value_type'.

    Returns:
        A list containing all unique dictionaries from array1 and array2. When there is a
        name and value_type pair that appears in both lists, the corresponding dictionary
        from array1 is included in the output list.
    """
    combined_dict = {
        (item["name"], item["value_type"]): item for item in reversed(array2)
    }
    combined_dict.update(
        {(item["name"], item["value_type"]): item for item in reversed(array1)}
    )
    return list(combined_dict.values())
