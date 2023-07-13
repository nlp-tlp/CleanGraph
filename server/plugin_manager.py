import os
import importlib.util

from plugin_interface import TextProcessorPluginInterface


class PluginManager:
    def __init__(self):
        self._plugins = {}

    def load_plugins(self, path):
        for filename in os.listdir(path):
            if filename.endswith(".py"):
                module_name = filename[:-3]
                spec = importlib.util.spec_from_file_location(
                    module_name, f"{path}/{filename}"
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                if issubclass(module.Plugin, TextProcessorPluginInterface):
                    self._plugins[module_name] = module.Plugin()

    def get_plugins(self):
        return self._plugins
