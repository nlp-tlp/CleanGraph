import React, { useContext } from "react";
import { Tooltip } from "@mui/material";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import { GraphContext } from "../../shared/context";
import { SnackbarContext } from "../../shared/snackbarContext";
import LoadingButton from "@mui/lab/LoadingButton";
import { useReviewItem } from "../../shared/hooks/useReviewItem";

const ReviewButton = () => {
  const [state, dispatch] = useContext(GraphContext);
  const { loading: submitting, handleReview } = useReviewItem();

  const unreviewedNodes = Object.values(state.data.nodes).filter(
    (node) => !node.is_reviewed
  ).length;

  const unreviewedEdges = Object.values(state.data.links).filter(
    (edge) => !edge.is_reviewed
  ).length;

  const reviewed = unreviewedNodes + unreviewedEdges === 0;

  // const handleReview = async () => {
  //   try {
  //     setSubmitting(true);
  //     // props: isNode, itemId, reviewAll, neighbours
  //     const response = await reviewItem(
  // true,
  // state.centralNodeId,
  // true,
  // state.data.neighbours[state.centralNodeId]
  //     );

  //     if (response.status === 200) {
  //       if (response.data.item_reviewed) {
  //         dispatch({
  //           type: "REVIEW_ITEM",
  //           payload: {
  //             isNode: true,
  //             itemId: state.centralNodeId,
  //             reviewAll: true,
  //             neighbours: state.data.neighbours[state.centralNodeId],
  //           },
  //         });
  //       } else {
  //         throw new Error();
  //       }
  //     } else {
  //       throw new Error();
  //     }
  //   } catch (error) {
  //     openSnackbar("error", "Error", "Failed to review items");
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  return (
    <Tooltip
      title={`Click to set the current subgraph view (${unreviewedNodes} nodes & ${unreviewedEdges} edges) as reviewed`}
    >
      <LoadingButton
        variant="outlined"
        startIcon={<ThumbUpAltIcon />}
        sx={{
          backgroundColor: "white",
          "&:hover": {
            backgroundColor: "white",
          },
        }}
        color="success"
        onClick={() =>
          handleReview({
            isNode: true,
            itemId: state.centralNodeId,
            reviewAll: true,
            neighbours: state.data.neighbours[state.centralNodeId],
          })
        }
        disabled={reviewed}
        loading={submitting}
      >
        Review
      </LoadingButton>
    </Tooltip>
  );
};

export default ReviewButton;
