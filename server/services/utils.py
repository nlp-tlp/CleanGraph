from typing import List, Dict, Union
import random
import string

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
