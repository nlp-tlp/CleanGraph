import React, { useContext, useState } from "react";
import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import { reviewItem } from "../../shared/api";
import { GraphContext } from "../../shared/context";
import { SnackbarContext } from "../../shared/snackbarContext";

const ReviewButton = () => {
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const [submitting, setSubmitting] = useState(false);

  const unreviewedNodes = Object.values(state.data.nodes).filter(
    (node) => !node.is_reviewed
  ).length;

  const unreviewedEdges = Object.values(state.data.links).filter(
    (edge) => !edge.is_reviewed
  ).length;

  const reviewed = unreviewedNodes + unreviewedEdges === 0;

  const handleReview = async () => {
    try {
      setSubmitting(true);
      // props: isNode, itemId, reviewAll, neighbours
      const response = await reviewItem(
        true,
        state.centralNodeId,
        true,
        state.data.neighbours[state.centralNodeId]
      );

      if (response.status === 200) {
        if (response.data.item_reviewed) {
          dispatch({
            type: "REVIEW_ITEM",
            payload: {
              isNode: true,
              itemId: state.centralNodeId,
              reviewAll: true,
              neighbours: state.data.neighbours[state.centralNodeId],
            },
          });
        } else {
          throw new Error();
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Failed to review items");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" p="12px">
        <CircularProgress size={22} />
      </Box>
    );
  } else {
    return (
      <IconButton
        onClick={handleReview}
        color="success"
        size="large"
        disabled={reviewed}
      >
        <Tooltip
          title={`Click to set the current subgraph view (${unreviewedNodes} nodes & ${unreviewedEdges} edges) as reviewed`}
        >
          <ThumbUpAltIcon />
        </Tooltip>
      </IconButton>
    );
  }
};

export default ReviewButton;
