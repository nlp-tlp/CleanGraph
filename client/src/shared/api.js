import axios from "axios";

export const updateItem = (itemId, itemType, data) => {
  console.log("api updateItem", itemId, itemType, data);
  return axios.patch(`/graph/${itemId}?item_type=${itemType}`, data);
};

export const mergeNode = (itemId, itemName, itemType) => {
  return axios.patch(
    `/graph/merge/${itemId}?new_source_name=${itemName}&new_source_type=${itemType}`
  );
};

export const getSampleSubgraph = (graphId) => {
  return axios.get(`/graph/sample/${graphId}`);
};

export const getGraphData = (graphId) => {
  return axios.get(`/graph/${graphId}`);
};

export const updateSettings = (graphId, data) => {
  return axios.patch(`/graph/settings/${graphId}`, data);
};

export const getPage = (graphId, centralNodeId, newPage, limit) => {
  return axios.get(`/graphs/${graphId}/${centralNodeId}`, {
    params: { skip: newPage, limit: limit },
  });
};

export const getPlugins = () => {
  return axios.get("/plugin");
};

export const createGraph = (data) => {
  return axios.post("/graph", data);
};

export const getGraphs = () => {
  return axios.get("/graph");
};

export const deleteGraph = (graphId) => {
  return axios.delete(`/graph/${graphId}`);
};

export const acknowledge = (
  isNode,
  itemId,
  isError,
  errorOrSuggestionItemId
) => {
  return axios.patch(`/graph/acknowledge`, {
    is_node: isNode,
    item_id: itemId,
    is_error: isError,
    error_or_suggestion_item_id: errorOrSuggestionItemId,
  });
};

export const getSubgraph = (graphId, nodeId) => {
  return axios.get(`/graph/${graphId}/${nodeId}`);
};

export const deleteProperty = (isNode, itemId, propertyId) => {
  return axios.delete(`/graph/property`, {
    params: {
      item_id: itemId,
      is_node: isNode,
      property_id: propertyId,
    },
  });
};

export const getErrors = (graphId) => {
  return axios.get(`/errors/${graphId}`);
};

export const getSuggestions = (graphId) => {
  return axios.get(`/suggestions/${graphId}`);
};

//
export const reviewItem = (isNode, itemId, reviewAll, neighbours = null) => {
  // Used on graph canvas and review all button for subgraphs.
  return axios.patch(
    `/graph/review/${itemId}`,
    { review_all: reviewAll, neighbours: neighbours },
    {
      params: { is_node: isNode },
    }
  );
};

export const deactivateItem = (isNode, itemId) => {
  // Used on graph canvas
  // Deactivates a single node or edge. If it's an edge, it will deactivate/activate orphaned nodes. If its a node, it will deactivate/activate 1-hop edges and their orphaned nodes.
  return axios.patch(`/graph/activation/${itemId}`, null, {
    params: { is_node: isNode },
  });
};

// Legend
export const addClass = (graphId, isNode, name, color) => {
  // Add new node or edge class.
  return axios.post(`/graph/item-classes/${graphId}`, {
    is_node: isNode,
    name: name,
    color: color,
  });
};
export const updateClass = (graphId, isNode, name, color, classId) => {
  // Updates existing node or edge class.
  return axios.patch(`/graph/item-classes/${graphId}`, {
    id: classId,
    is_node: isNode,
    name: name,
    color: color,
  });
};
