import {
  Box,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import CloseIcon from "@mui/icons-material/Close";

const Help = ({ handleClose }) => {
  return (
    <Box>
      <Box p="1rem 2rem">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="column">
            <Typography variant="h6">Help</Typography>
            {/* <Typography variant="caption">
              Create, update or view entity and relation classes
            </Typography> */}
          </Stack>
          <Tooltip title="Click to close">
            <IconButton onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Divider flexItem />
      <Stack p={4} spacing={4}>
        <Box>
          <Typography fontWeight={700}>About CleanGraph</Typography>
          <Typography>Something goes here...</Typography>
        </Box>
        <Box>
          <Typography fontWeight={700}>Documentation</Typography>
          <Typography>
            Link to documentation or something goes here...
          </Typography>
        </Box>
        <Box>
          <Typography fontWeight={700}>Shortcuts</Typography>
          <Typography>Something goes here...</Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default Help;
