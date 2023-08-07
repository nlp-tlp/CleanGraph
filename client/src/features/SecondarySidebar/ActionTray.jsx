import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Box, Stack } from "@mui/system";
import SubmittingProgress from "./SubmittingProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import SwapHorizontalCircleIcon from "@mui/icons-material/SwapHorizontalCircle";
import { useReviewItem } from "../../shared/hooks/useReviewItem";
import { useUpdateItem } from "../../shared/hooks/useUpdateItem";

const ActionTray = ({ currentItem, currentItemIsNode }) => {
  const { loading: reviewLoading, handleReview } = useReviewItem();
  const { loading, handleUpdate } = useUpdateItem();

  const handleActivation = async () => {
    await handleUpdate({
      context: "activation",
      payload: { is_active: !currentItem.is_active },
    });
  };

  const reverseEdgeDirection = async () => {
    await handleUpdate({
      context: "reverseEdgeDirection",
      payload: { reverse_direction: true },
    });
  };

  return (
    <Box p={1}>
      <Stack
        direction="row"
        spacing={1}
        justifyContent="space-evenly"
        alignItems="center"
      >
        <Tooltip
          title={`Click to set this ${currentItemIsNode ? "node" : "edge"} as ${
            currentItem.is_reviewed ? "unreviewed" : "reviewed"
          }`}
        >
          {reviewLoading ? (
            <SubmittingProgress />
          ) : (
            <IconButton
              onClick={() =>
                handleReview({
                  isNode: currentItemIsNode,
                  itemId: currentItem._id,
                  reviewAll: false,
                })
              }
            >
              <CheckBoxIcon
                fontSize="small"
                color={currentItem.is_reviewed ? "success" : "primary"}
              />
            </IconButton>
          )}
        </Tooltip>
        <Tooltip
          title={`Click to set this ${currentItemIsNode ? "node" : "edge"} as ${
            currentItem.is_active ? "inactive" : "active"
          }`}
        >
          {loading === "activation" ? (
            <SubmittingProgress />
          ) : (
            <IconButton onClick={handleActivation}>
              <DeleteIcon
                fontSize="small"
                color={currentItem.is_active ? "primary" : "error"}
              />
            </IconButton>
          )}
        </Tooltip>
        {!currentItemIsNode &&
          (loading === "reverseEdgeDirection" ? (
            <SubmittingProgress />
          ) : (
            <Tooltip title="Click to reverse edge direction">
              <IconButton onClick={reverseEdgeDirection}>
                <SwapHorizontalCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ))}
      </Stack>
    </Box>
  );
};

export default ActionTray;
