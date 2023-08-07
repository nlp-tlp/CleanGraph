<!-- Please note that if node and edge properties have the key "frequency" which is an integer, it will be used to weight the node/edge. Otherwise, uploading triples with duplicates will result in frequencies being calculated automatically. -->

# User Guide

## Graph Creation in CleanGraph

You can create a graph in CleanGraph by utilizing the `/create` endpoint. This route allows you to either upload or manually input graph data in JSON format. You may also select optional models for graph refinement and completion at this stage.

### Caution

- **No Nested Properties**: Properties must be simple key-value pairs, and nested properties are not allowed.
- **Handling Duplicate Nodes**: If duplicate nodes are present in the data, their properties will be merged, and duplicates will be removed.

### Graph Data Formats

CleanGraph currently supports graphs formatted in JSON. Here are the formats that can be used:

#### Simple, Untyped Graph

```json
[
    {
        "head": "string",
        "edge": "string",
        "tail": "string"
    },
    ... // Additional triples
]
```

#### Typed Graph

```json
[
    {
        "head": "string",
        "head_type": "string",
        "edge": "string",
        "tail": "string",
        "tail_type": "string"
    },
    ... // Additional triples
]
```

#### Typed Graph with Properties

```json
[
    {
        "head": "string",
        "head_type": "string",
        "head_properties": {
            // Key-value pairs for head properties
        },
        "edge": "string",
        "edge_properties": {
            // Key-value pairs for edge properties
        },
        "tail": "string",
        "tail_type": "string",
        "tail_properties": {
            // Key-value pairs for tail properties
        }
    },
    ... // Additional triples
]
```

**Note**: In the Typed Graph with Properties format, the head_properties, edge_properties, and tail_properties must be objects containing key-value pairs.
