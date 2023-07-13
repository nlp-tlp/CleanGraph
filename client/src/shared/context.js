import { useReducer, createContext } from "react";
import { sortSubgraphs } from "./utils";

const initialState = {
  loading: true,
  graphs: [],
  graph: { name: "", createdAt: "" },
  data: { nodes: [], links: [], neighbours: [] },
  subgraphs: [],
  sortType: "alpha",
  sortDescending: true,
  ontology: [],
  ontologyName2Id: {},
  centralNode: null, // This is the central node of the rendered subgraph
  currentNode: null, // This is the central node for the rendered subgraph
  currentItem: null, // This is the current item selected (node or edge)
  maxTriples: 0,
  selectedNodeId: null,
  leftClickNodeInfo: null,
  modal: {
    open: false,
    view: null,
  },
};

export const GraphContext = createContext();

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_GRAPH": {
      return {
        ...state,
        data: {
          nodes: action.payload.nodes,
          links: action.payload.links,
          neighbours: action.payload.neighbours,
        },
        currentNode: action.payload.node,
        centralNode: action.payload.node,
        maxTriples: action.payload.max_triples,
      };
    }
    case "SET_LOADING": {
      return { ...state, loading: action.payload };
    }
    case "SET_VALUE": {
      return { ...state, [action.payload.key]: action.payload.value };
    }
    case "DELETE_GRAPH": {
      return {
        ...state,
        graphs: state.graphs.filter((g) => g.id !== action.payload.graphId),
      };
    }
    case "SORT_SUBGRAPHS":
      return {
        ...state,
        subgraphs: sortSubgraphs(
          state.subgraphs,
          action.payload.sortType,
          action.payload.sortDescending
        ),
        sortType: action.payload.sortType,
        sortDescending: action.payload.sortDescending,
      };
    case "UPDATE_NODE":
      // Update properties of node and it's associated links.
      let { id: nodeId, ...newNodeValues } = action.payload;

      // Get original node
      const originalNode = state.data.nodes.find((n) => n.id === nodeId);

      // If node type changed, update color based on ontology
      if (newNodeValues.type !== originalNode.type) {
        const matchingOntologyItem = state.ontology.find(
          (i) => i.id === newNodeValues.type
        );
        if (matchingOntologyItem) {
          newNodeValues.color = matchingOntologyItem.color;
        }
      }

      const updatedNode = {
        ...originalNode,
        ...newNodeValues,
        type: newNodeValues.typeName,
      };

      // Update nodes with updated node
      const updatedNodes = state.data.nodes.map((n) =>
        n.id === nodeId ? updatedNode : n
      );

      // Update links
      const updatedLinks = state.data.links.map((l) => ({
        ...l,
        source: l.source.id,
        target: l.target.id,
      }));

      return {
        ...state,
        data: { ...state.data, nodes: updatedNodes, links: updatedLinks },
        currentNode: updatedNode,
      };

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
        // open the new view
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
