from fastapi import APIRouter
from plugin_manager import PluginManager

router = APIRouter(prefix="/plugin", tags=["Plugin"])
plugin_manager = PluginManager()


@router.on_event("startup")
async def startup_event():
    print("Checking for plugins...")
    plugin_manager.load_plugins("./plugins")


@router.get("/")
def get_plugins():
    """Fetches available plugins for error detection models (edm) and completion models (cm)"""
    plugins = plugin_manager.get_plugins()

    plugin_names = {key: list(plugins[key].keys()) for key in plugins.keys()}

    return plugin_names


# def extract_errors():
#     try:
#         result = plugin.process(text)
#     except Exception as e:
#         print(f"Plugin {plugin.__name__} threw an exception: {e}")
