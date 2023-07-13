import React, { useContext } from "react";
import { IconButton, Tooltip } from "@mui/material";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import { reviewSubgraph } from "../shared/api";
import { GraphContext } from "../shared/context";

const ReviewButton = () => {
  const [state] = useContext(GraphContext);

  const handleReview = async () => {
    console.log(
      `Setting subgraph centred on (${state.centralNode.name}) as reviewed`
    );
    await reviewSubgraph(state.centralNode.id, !state.centralNode.is_reviewed);
  };

  // console.log("state", state);

  return (
    <Tooltip title="Click to mark subgraph as reviewed">
      <IconButton onClick={handleReview} color="success">
        <ThumbUpAltIcon />
      </IconButton>
    </Tooltip>
  );
};

export default ReviewButton;
