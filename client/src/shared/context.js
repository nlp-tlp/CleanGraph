import { useReducer, createContext } from "react";
import { putIdOnTop } from "./utils";

const initialState = {
  loading: true,
  graphs: [],
  graph: { name: "", createdAt: "" },
  data: { nodes: [], links: [], neighbours: [] },
  settings: {
    graph: { display_edge_labels: true, node_size: "medium", limit: 10 },
  },
  subgraphs: [],
  ontology: [],
  ontologyId2Detail: { nodes: {}, edges: {} },
  centralNodeId: null,
  currentItemId: null,
  currentItemIsNode: null,
  maxTriples: 0,
  modal: {
    open: null,
    view: null,
  },
};

export const GraphContext = createContext();

const updateEdgeDirection = (state, itemId, newItemValues) => {
  return {
    ...newItemValues,
    source: state.data.links[itemId].target,
    target: state.data.links[itemId].source,
  };
};

const updateSubgraphs = (state, itemId, newItemValues) => {
  return state.subgraphs.map((sg) =>
    sg._id === itemId
      ? { ...sg, name: newItemValues.name, type: newItemValues.type }
      : sg
  );
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_GRAPHS":
      return { ...initialState, graphs: action.payload };
    case "SET_GRAPH": {
      // For setting the entire project graph details
      return {
        ...state,
        graph: {
          name: action.payload.name,
          createdAt: action.payload.created_at,
          updatedAt: action.payload.updated_at,
        },
        settings: { ...state.settings, ...action.payload.settings },
        ontology: {
          nodes: action.payload.node_classes,
          edges: action.payload.edge_classes,
        },
        ontologyId2Detail: {
          nodes: Object.assign(
            {},
            ...action.payload.node_classes.map((i) => ({
              [i._id]: { name: i.name, color: i.color },
            }))
          ),
          edges: Object.assign(
            {},
            ...action.payload.edge_classes.map((i) => ({
              [i._id]: { name: i.name, color: i.color },
            }))
          ),
        },
        subgraphs: action.payload.subgraphs,
        totalErrors: action.payload.total_errors,
        totalSuggestions: action.payload.total_suggestions,
        startNodeCount: action.payload.start_node_count,
        startEdgeCount: action.payload.start_edge_count,
      };
    }
    case "SET_SUBGRAPH":
      // For setting subsequent subgraph selections including large graph paginations
      return {
        ...state,
        data: {
          nodes: action.payload.nodes,
          links: action.payload.links,
          neighbours: action.payload.neighbours,
        },
        currentItemId: action.payload.central_node_id,
        currentItemIsNode: true,
        centralNodeId: action.payload.central_node_id,
        maxTriples: action.payload.max_triples,
        // subgraphs: putIdOnTop(state.subgraphs, action.payload.central_node_id),
        loading: false,
      };
    case "SET_LOADING": {
      return { ...state, loading: action.payload };
    }
    case "SET_CURRENT_ITEM": {
      return {
        ...state,
        currentItemId: action.payload.id,
        currentItemIsNode: action.payload.isNode,
      };
    }
    case "SET_VALUE": {
      return { ...state, [action.payload.key]: action.payload.value };
    }
    case "DELETE_GRAPH": {
      return {
        ...state,
        graphs: state.graphs.filter((g) => g._id !== action.payload.graphId),
      };
    }
    case "UPDATE_ITEM": {
      // Updates item data/properties/topology.
      // Updates subgraphs too.
      let { itemId, isNode, ...newItemValues } = action.payload;
      const itemType = isNode ? "nodes" : "links";

      // Edge direction reverse
      if (newItemValues.reverse_direction) {
        newItemValues = updateEdgeDirection(state, itemId, newItemValues);
      }

      const newSubgraphs = isNode
        ? updateSubgraphs(state, itemId, newItemValues)
        : state.subgraphs;

      return {
        ...state,
        subgraphs: newSubgraphs,
        data: {
          ...state.data,
          [itemType]: {
            ...state.data[itemType],
            [itemId]: {
              ...state.data[itemType][itemId],
              ...newItemValues,
            },
          },
        },
      };
    }
    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        graph: { ...state.graph, updatedAt: new Date().toISOString() },
      };

    case "DELETE_PROPERTY": {
      const { itemId, isNode, propertyId } = action.payload;
      const itemType = isNode ? "nodes" : "links";

      // Copy only the necessary parts of the state
      const itemData = state.data[itemType][itemId];
      const updatedProperties = itemData.properties.filter(
        (p) => p.id !== propertyId
      );

      return {
        ...state,
        data: {
          ...state.data,
          [itemType]: {
            ...state.data[itemType],
            [itemId]: {
              ...itemData,
              properties: updatedProperties,
            },
          },
        },
      };
    }

    case "UPDATE_ACKNOWLEDGEMENT": {
      const { itemId, isNode, isError, errorOrSuggestionItemId } =
        action.payload;
      const itemType = isNode ? "nodes" : "links";
      const arrayName = isError ? "errors" : "suggestions";

      // Make a copy of the current state to avoid mutating it directly
      const newState = JSON.parse(JSON.stringify(state));

      // Find the item to update and change its acknowledged property
      const itemToUpdate = newState.data[itemType][itemId][arrayName].find(
        (item) => item.id === errorOrSuggestionItemId
      );
      if (itemToUpdate) {
        itemToUpdate.acknowledged = true;
        itemToUpdate.updated_at = new Date().toISOString();
      }

      return newState;
    }

    case "REVIEW_ITEM":
      const { isNode, itemId, reviewAll, neighbours } = action.payload;
      const itemType = isNode ? "nodes" : "links";

      // Make a copy of the current state to avoid mutating it directly
      const newState = JSON.parse(JSON.stringify(state));
      const updatedAt = new Date().toISOString();

      if (reviewAll) {
        const neighbourNodeIds = new Set([itemId, ...neighbours.nodes]);
        const neighbourEdgeIds = new Set([itemId, ...neighbours.links]);

        if (neighbourNodeIds.size > 0) {
          Object.entries(newState.data.nodes).forEach(([id, node]) => {
            if (neighbourNodeIds.has(id)) {
              node.is_reviewed = true;
              node.updated_at = updatedAt;
            }
          });
        }

        if (neighbourEdgeIds.size > 0) {
          Object.entries(newState.data.links).forEach(([id, edge]) => {
            if (neighbourEdgeIds.has(id)) {
              edge.is_reviewed = true;
              edge.updated_at = updatedAt;
            }
          });
        }
      } else {
        // Find the item to update and change its "is_reviewed" property
        const itemToUpdate = newState.data[itemType][itemId];
        if (itemToUpdate) {
          itemToUpdate.is_reviewed = !itemToUpdate.is_reviewed;
          itemToUpdate.updated_at = updatedAt;
        }
      }

      return newState;

    case "TOGGLE_ITEM_ACTIVATION": {
      let { itemId, isActive, updatedNodeIds, updatedEdgeIds } = action.payload;

      updatedNodeIds = new Set([...updatedNodeIds, itemId]);
      updatedEdgeIds = new Set([...updatedEdgeIds, itemId]);
      const updatedAt = new Date().toISOString();

      // Make a copy of the current state to avoid mutating it directly
      const newState = JSON.parse(JSON.stringify(state));

      if (updatedNodeIds.size > 0) {
        Object.entries(newState.data.nodes).forEach(([id, node]) => {
          if (updatedNodeIds.has(id)) {
            node.is_active = isActive;
            node.updated_at = updatedAt;
          }
        });
      }

      if (updatedEdgeIds.size > 0) {
        Object.entries(newState.data.links).forEach(([id, edge]) => {
          if (updatedEdgeIds.has(id)) {
            console.log("updating edge activation...");
            edge.is_active = isActive;
            edge.updated_at = updatedAt;
          }
        });
      }

      return newState;
    }

    case "ADD_CLASS_ITEM": {
      const { newClass, isNode } = action.payload;
      const ontologyType = isNode ? "nodes" : "edges";

      return {
        ...state,
        ontology: {
          ...state.ontology,
          [ontologyType]: [...state.ontology[ontologyType], newClass],
        },
        ontologyName2Color: {
          ...state.ontologyName2Color,
          [ontologyType]: {
            ...state.ontologyName2Color[ontologyType],
            [newClass.name]: newClass.color,
          },
        },
      };
    }

    case "UPDATE_CLASS_ITEM": {
      const { updatedClass, isNode } = action.payload;
      const ontologyType = isNode ? "nodes" : "links";

      // Make a copy of the current state to avoid mutating it directly
      const newState = JSON.parse(JSON.stringify(state));

      // Find the item to update and change its acknowledged property
      const classToUpdate = newState.ontology[ontologyType].find(
        (item) => item._id === updatedClass.id
      );

      if (classToUpdate) {
        classToUpdate.name = updatedClass.name;
        classToUpdate.color = updatedClass.color;
      }

      return newState;
    }

    case "MERGE_NODES": {
      // Avoid direct state mutation
      let newState = { ...state };

      // Destructure the payload for clearer reference
      const { old_node_ids, new_subgraph } = action.payload;

      // Filter out the old subgraphs and add the new one in a single operation
      newState.subgraphs = [
        ...newState.subgraphs.filter((sg) => !old_node_ids.includes(sg._id)),
        new_subgraph,
      ];

      return newState;
    }
    case "TOGGLE_MODAL":
      if (!action.payload || action.payload.view === undefined) {
        // if no view is supplied, close the modal
        return {
          ...state,
          modal: {
            ...state.modal,
            view: null,
            open: false,
          },
        };
      } else if (state.modal.view === action.payload.view) {
        // if the current view is already open, toggle it
        return {
          ...state,
          modal: {
            ...state.modal,
            open: !state.modal.open,
          },
        };
      } else {
        return {
          ...state,
          modal: {
            view: action.payload.view,
            open: true,
          },
        };
      }
    default:
      return {};
  }
};

export const GraphProvider = (props) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <GraphContext.Provider value={[state, dispatch]}>
      {props.children}
    </GraphContext.Provider>
  );
};
