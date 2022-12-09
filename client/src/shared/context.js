import { useReducer, createContext, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { TEST_DATA } from "./data";
import { getRandomColor, getNodeNeighbours, sortSubgraphs } from "./utils";
import axios from "axios";

const initialState = {
  loading: true,
  graphsLoaded: false,
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
  maxTriples: 0,

  selectedNodeId: null,
  leftClickNodeInfo: null,
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
    // case "LOAD_DATA":
    //   // Converts JSON data to nodes/edges
    //   // console.log("processing data");

    //   // console.log(TEST_DATA);

    //   const testData = TEST_DATA.slice(0, state.limit);

    //   // Create nodes (these are unique based on their text and type)
    //   const nodes = testData.flatMap((t) => [
    //     { label: t["subj"], class: t["subj_type"] },
    //     { label: t["obj"], class: t["obj_type"] },
    //   ]);
    //   console.log("total nodes", nodes.length);

    //   var unique_nodes = nodes.reduce((unique, o) => {
    //     if (
    //       !unique.some((obj) => obj.label === o.label && obj.class === o.class)
    //     ) {
    //       unique.push(o);
    //     }
    //     return unique;
    //   }, []);
    //   // console.log("unique nodes", unique_nodes.length);

    //   // Create colors for node types
    //   const node_classes = [
    //     ...new Set(unique_nodes.map((n) => n.class.split("/")[0])),
    //   ];
    //   // console.log("node_classes", node_classes);

    //   const node_color_map = Object.assign(
    //     {},
    //     ...node_classes.map((nc) => ({
    //       [nc]: getRandomColor(1337),
    //     }))
    //   );

    //   // console.log("node_color_map", node_color_map);

    //   // Add ids to unique nodes
    //   unique_nodes = unique_nodes.map((n, index) => ({
    //     ...n,
    //     id: uuidv4(),
    //     color: {
    //       border: node_color_map[n.class.split("/")[0]],
    //       background: node_color_map[n.class.split("/")[0]],
    //     },
    //     font: {
    //       color: "black",
    //     },
    //     active: true,
    //   }));
    //   // console.log(unique_nodes);

    //   // Create links between nodes {source: nId, target: nId, label: str}

    //   const unique_links = Object.assign(
    //     {},
    //     ...[...new Set(testData.map((t) => t.relation))].map(
    //       (label, index) => ({
    //         [label]: getRandomColor(2448),
    //       })
    //     )
    //   );

    //   const links = testData.map((t) => ({
    //     source: unique_nodes.filter(
    //       (n) => n.label === t.subj && n.class === t.subj_type
    //     )[0].id,
    //     target: unique_nodes.filter(
    //       (n) => n.label === t.obj && n.class === t.obj_type
    //     )[0].id,
    //     label: t.relation,
    //     id: uuidv4(),
    //     color: unique_links[t.relation],
    //     active: true,
    //   }));

    //   // console.log("links", links);

    //   // console.log("unique_links", unique_links);

    //   // console.log({ nodes: unique_nodes, links: links });

    //   // Get relationships to help user isolate graph information
    //   const neighbours = getNodeNeighbours(unique_nodes, links);
    //   // console.log("neighbours", neighbours);

    //   //   Update value of nodes; this is their degree
    //   unique_nodes = unique_nodes.map((n) => ({
    //     ...n,
    //     value: neighbours[n.id].links.length,
    //   }));

    //   return {
    //     ...state,
    //     data: { nodes: unique_nodes, links: links, neighbours: neighbours },
    //     prevStateData: {
    //       nodes: unique_nodes,
    //       links: links,
    //       neighbours: neighbours,
    //     },
    //     originalData: { nodes: unique_nodes, links: links },
    //     legend: { nodes: node_color_map, edges: unique_links },
    //     subgraphs: subgraphs,
    //     loading: false,
    //     currentTripletCount: links.length,
    //   };
  }
};

export const GraphProvider = (props) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const fetchGraphs = async () => {
      if (!state.graphsLoaded) {
        console.log("Loading graphs...");
        await axios.get("/graphs/").then((res) => {
          dispatch({
            type: "SET_VALUE",
            payload: { key: "graphs", value: res.data },
          });
          dispatch({
            type: "SET_VALUE",
            payload: { key: "graphsLoaded", value: true },
          });
        });
      }
    };
    fetchGraphs();
  }, [state.graphsLoaded]);

  return (
    <GraphContext.Provider value={[state, dispatch]}>
      {props.children}
    </GraphContext.Provider>
  );
};
