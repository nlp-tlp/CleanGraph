import {
  Box,
  Divider,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import { DocsURL } from "../../shared/misc";

const shortcuts = [
  {
    name: "Toggle Item Focus",
    shortcut: "LMB",
    description:
      "Toggles an item (node/edge) as focused. This will display the properties panel of the item.",
  },
  {
    name: "Toggle Item Activation",
    shortcut: "RMB",
    description:
      "Toggles the activation state of an item. All items will toggle orphan nodes (those that would exist without an edge in the graph). Nodes additionally toggle 1-hop edges.",
  },
  {
    name: "Toggle Item Review",
    shortcut: "SHIFT + LMB",
    description: "Toggles the reviewed state of an item.",
  },
];

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
            <Typography variant="caption">
              Get insights into CleanGraph's functionality, shortcuts, and
              documentation.
            </Typography>
          </Stack>
          <Tooltip title="Click to close">
            <IconButton onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Divider flexItem />
      <Stack p={4} spacing={4} maxWidth={600}>
        <Box>
          <Typography fontWeight={700} gutterBottom>
            About CleanGraph
          </Typography>
          <Typography variant="body2">
            CleanGraph is an application for interactive knowledge graph
            refinement and compeletion. Lorem ipsum dolor sit amet, consectetur
            adipiscing elit. Sed viverra cursus purus, sed tempor justo maximus
            eu. Mauris posuere dui nec libero dapibus, eu laoreet nisl
            vestibulum. Fusce mattis enim nec luctus convallis.
          </Typography>
        </Box>
        <Box>
          <Typography fontWeight={700} gutterBottom>
            Documentation
          </Typography>
          <Typography variant="body2">
            Click{" "}
            <Link
              component="a"
              href={DocsURL}
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </Link>{" "}
            to view CleanGraph's documentation.
          </Typography>
        </Box>
        <Box>
          <Typography fontWeight={700} gutterBottom>
            Shortcuts
          </Typography>
          <Stack direction="column" spacing={2}>
            {shortcuts.map((sc) => (
              <Stack direction="row" spacing={4} alignItems="center">
                <Box minWidth={120}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'Consolas, "Courier New", monospace',
                      fontSize: 14,
                      backgroundColor: "#f5f5f5",
                      padding: "0.5rem",
                      borderRadius: 4,
                      boxShadow: "0 0 0 1px #ddd",
                      overflowX: "auto",
                      textTransform: "capitalize",
                      textAlign: "center",
                    }}
                  >
                    {sc.shortcut}
                  </Typography>
                </Box>
                <Stack direction="column" alignItems="left">
                  <Typography variant="body1">{sc.name}</Typography>
                  <Typography variant="caption">{sc.description}</Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default Help;
