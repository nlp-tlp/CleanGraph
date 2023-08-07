import { Box, Stack } from "@mui/system";
import React from "react";
import { Button } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

const UpdateTray = ({ stateChanged, handleReset, handleUpdate, loading }) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "right", width: "100%" }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          size="small"
          variant="outlined"
          disabled={!stateChanged}
          onClick={handleReset}
        >
          Reset
        </Button>
        <LoadingButton
          variant="contained"
          size="small"
          disabled={!stateChanged}
          onClick={handleUpdate}
          loading={loading}
        >
          Update
        </LoadingButton>
      </Stack>
    </Box>
  );
};

export default UpdateTray;
