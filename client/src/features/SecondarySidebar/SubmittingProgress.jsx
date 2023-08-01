import { Box, CircularProgress } from "@mui/material";
import React from "react";

const SubmittingProgress = () => {
  return (
    <Box p="8px" display="flex" alignItems="center" justifyContent="center">
      <CircularProgress size="1.25rem" />
    </Box>
  );
};

export default SubmittingProgress;
