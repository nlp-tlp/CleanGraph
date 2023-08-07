import { useState, useContext } from "react";
import { reviewItem } from "../api";
import { SnackbarContext } from "../snackbarContext";
import { GraphContext } from "../context";

export const useReviewItem = () => {
  const [loading, setLoading] = useState(null);
  const { openSnackbar } = useContext(SnackbarContext);
  const [state, dispatch] = useContext(GraphContext);

  const handleReview = async ({
    isNode,
    itemId,
    reviewAll = false,
    neighbours = null,
  }) => {
    setLoading(true);

    console.log(isNode, itemId, reviewAll, neighbours);

    try {
      const response = await reviewItem(isNode, itemId, reviewAll, neighbours);

      if (response.status === 200) {
        if (response.data.item_reviewed) {
          dispatch({
            type: "REVIEW_ITEM",
            payload: {
              isNode,
              itemId,
              reviewAll,
              neighbours,
              reviewedNodes: response.data.reviewed_nodes,
              reviewedEdges: response.data.reviewed_edges,
              subgraphProgress: response.data.subgraph_progress,
            },
          });
          openSnackbar(
            "success",
            "Success",
            `${isNode ? "node" : "edge"} review updated`
          );
        } else {
          throw new Error();
        }
      } else {
        throw new Error("Unable to review item");
      }
    } catch (error) {
      openSnackbar("error", "Error", "Unable to review item");
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleReview };
};
