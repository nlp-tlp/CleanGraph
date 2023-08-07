# Plugins

This page explains the way plugins function within CleanGraph and provides a guide on how to create your own.

## Plugin Architecture

CleanGraph has been designed around a plugin architecture. It's composed of an **Interface** (`./server/plugin_interface.py`), a **Manager** (`./server/plugin_manager.py`), and **Models** (`./server/plugin_models.py`).

### Interface

At present, the interface supports two types of plugins:

- **Error Detection Models (EDM)** - These are used for knowledge graph refinement.
- **Completion Models (CM)** - Thesea re used for knowledge graph completion.

The `plugin_interface.py` file includes two interfaces:

- `ErrorDetectionModelPluginInterface`
- `CompletionModelPluginInterface`

Both of these require an `execute` method that accepts `ModelInput` and returns `ModelOutput` (refer to [Models](#models) for more information). You are free to modify and extend these as needed.

### Manager

The plugin manager plays a crucial role in organising the available plugins and ensuring that they are accessible to both the frontend and during graph creation. The manager specifically searches for plugins within the plugin directory (defaulting to `./plugins`) and determines whether they are of the types `ErrorDetectionModelPluginInterface` or `CompletionModelPluginInterface`.

To prevent any issues, ensure that only valid plugins are stored in this directory. If there are any files or folders that should not be read from the directory, prefix them with an underscore (`_`).

### Models

You may refer to `./server/plugin_models.py` for the definitions of `ModelInput` and `ModelOutput`. These classes are used by the plugin interfaces for executing plugin functionality.

#### ModelInput

This class represents the input required by the plugin's execute method. It may consist of various parameters necessary for the specific plugin's operation.

#### ModelOutput

This class encapsulates the output returned by the plugin's execute method. It typically includes the results of the execution, such as error detection or completion data.

## Plugin use

Plugins are used after graphs are created in the front end client. This allows the created graph to be supplied to the selected plugins which are then used to enrich the graph nodes and edges.

## Writing Your Own Plugin

Interested in creating your own plugin? Consider the following guidelines:

1. **Determine the Type** - Decide whether you are creating an error detection or completion model.
2. **Implement the Interface** - Based on the type, implement the corresponding interface from `plugin_interface.py`.
3. **Place in the Correct Directory** - Save the plugin in the designated plugin directory (`./plugins`), ensuring it adheres to the naming conventions.
4. **Test Your Plugin** - Verify that your plugin works as expected within the CleanGraph environment.

By following these guidelines, you can contribute to the extensibility and functionality of CleanGraph.

## Example plugins

The `./server/plugins` directory contains two example plugins, one for EDM and one for CM.

### Node Edit Distance (EDM)

### Unsupervised Node2Vec Link Prediction (CM)
