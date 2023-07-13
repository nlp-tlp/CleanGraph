from plugin_interface import TextProcessorPluginInterface
from plugin_models import InputModel, OutputModel


class Plugin(TextProcessorPluginInterface):
    def process(self, input_model: InputModel) -> OutputModel:
        return OutputModel(result=input_model.text.lower())
