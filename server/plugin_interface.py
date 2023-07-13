from abc import ABC, abstractmethod
from plugin_models import InputModel, OutputModel


class TextProcessorPluginInterface(ABC):
    @abstractmethod
    def process(self, text: InputModel) -> OutputModel:
        raise NotImplementedError
