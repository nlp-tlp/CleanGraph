import os
import importlib.util

from plugin_interface import (
    ErrorDetectionModelPluginInterface,
    CompletionModelPluginInferface,
)


class PluginManager:
    def __init__(self):
        self._plugins = {"edm": {}, "cm": {}}

    def load_plugins(self, path):
        for filename in os.listdir(path):
            if filename.endswith(".py"):
                module_name = filename[:-3]

                if not module_name.startswith("_"):
                    spec = importlib.util.spec_from_file_location(
                        module_name, f"{path}/{filename}"
                    )
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)

                    if issubclass(module.Plugin, ErrorDetectionModelPluginInterface):
                        self._plugins["edm"][module_name] = module.Plugin()

                    if issubclass(module.Plugin, CompletionModelPluginInferface):
                        self._plugins["cm"][module_name] = module.Plugin()

    def get_plugins(self):
        return self._plugins
