import axios from "axios";

export const updateNode = (nodeId, data) => {
  return axios.patch(`/graphs/node/${nodeId}`, data);
};

export const reviewSubgraph = (nodeId, isReviewed) => {
  return axios.patch(`/graphs/node/review/${nodeId}?is_reviewed=${isReviewed}`);
};
