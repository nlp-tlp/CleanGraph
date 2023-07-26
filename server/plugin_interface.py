"""
    The plugin interface provides the entire graph as a set of triples with properties at creation time to the Plugin class "execute" function. Each triples node/edge can have any arbitrary 'error' or 'suggestion' appended to it which will be added when provided an output from the "execute" function of [{'is_node': bool, 'id': str, 'error_type': str, 'error_value': str}] for errors and [{'is_node': bool, 'id': str, 'suggestion_type': str, 'suggestion_value': str}] for suggestions. These will then be rendered in the UI, etc.

    TODO:
    - optional kwargs (these can be rendered in the client), they will require typing to render UI elements correctly.
    - validation/guard rails to ensure it doesn't break the system when they are called at graph creation time
    - timeout/resource utilisation ?

"""

from abc import ABC, abstractmethod
from plugin_models import ModelInput, ModelOutput


class BasePlugin(ABC):
    name: str = "Unnamed Plugin"
    description: str = "No description"

    @abstractmethod
    def execute(self, data: ModelInput, **kwargs) -> ModelOutput:
        raise NotImplementedError("An execute method must be supplied.")


class ErrorDetectionModelPluginInterface(BasePlugin):
    pass


class CompletionModelPluginInferface(BasePlugin):
    pass
