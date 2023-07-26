from plugin_interface import (
    ErrorDetectionModelPluginInterface,
)
from plugin_models import ModelInput, ModelOutput


class Plugin(ErrorDetectionModelPluginInterface):
    name: str = "Edge Direction"
    description: str = (
        "Detects erroneous link directions between nodes using node embeddings."
    )

    def execute(self, data: ModelInput) -> ModelOutput:
        return ModelOutput(result=data)
