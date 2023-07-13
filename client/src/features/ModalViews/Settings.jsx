import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
} from "@mui/material";
import React, { useContext } from "react";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { GraphContext } from "../../shared/context";
import { green, red } from "@mui/material/colors";

const Settings = ({ handleClose }) => {
  const [state] = useContext(GraphContext);

  return (
    <Box>
      <Box p="1rem 2rem">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Settings</Typography>
          <Tooltip title="Click to close">
            <IconButton onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Divider flexItem />
      <Box p="2rem">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column">
            <Typography variant="body1">Show Issues</Typography>
            <Typography variant="caption">
              Toggle whether issues should be displayed
            </Typography>
          </Stack>
          <ToggleButtonGroup
            color="primary"
            size="small"
            exclusive
            value={state.settings?.issuesVisible || false} // TODO: update state/api to provide persistent settings.
          >
            <Tooltip title="Click to toggle issues on">
              <ToggleButton value={true}>
                <VisibilityOffIcon />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Click to toggle issues off">
              <ToggleButton value={false}>
                <VisibilityIcon />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column">
            <Typography variant="body1">Show Edge Labels</Typography>
            <Typography variant="caption">
              Toggle whether edge labels should be displayed
            </Typography>
          </Stack>
          <ToggleButtonGroup
            color="primary"
            size="small"
            exclusive
            value={state.settings?.edgesVisible || false} // TODO: update state/api to provide persistent settings.
          >
            <Tooltip title="Click to toggle edge labels on">
              <ToggleButton value={true}>
                <VisibilityOffIcon />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Click to toggle edge labels off">
              <ToggleButton value={false}>
                <VisibilityIcon />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column">
            <Typography variant="body1">Node Size</Typography>
            <Typography variant="caption">
              Select the relative size of graph nodes
            </Typography>
          </Stack>
          <ToggleButtonGroup
            color="primary"
            size="small"
            exclusive
            value={state.settings?.nodeSize || "medium"} // TODO: update state/api to provide persistent settings.
          >
            <Tooltip title="Click to toggle small node sizes">
              <ToggleButton value={"small"}>Small</ToggleButton>
            </Tooltip>
            <Tooltip title="Click to toggle medium node sizes">
              <ToggleButton value={"medium"}>Medium</ToggleButton>
            </Tooltip>
            <Tooltip title="Click to toggle large node sizes">
              <ToggleButton value={"large"}>Large</ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column">
            <Typography variant="body1">Deactivated Item Color</Typography>
            <Typography variant="caption">
              Specify the color of deactivated items
            </Typography>
          </Stack>
          <Tooltip title="Enter hex code of desired color">
            <TextField
              size="small"
              placeholder={red[500]}
              sx={{ maxWidth: 120 }}
            />
          </Tooltip>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column">
            <Typography variant="body1">Reviewed Item Color</Typography>
            <Typography variant="caption">
              Specify the color of reviewed items
            </Typography>
          </Stack>
          <Tooltip title="Enter hex code of desired color">
            <TextField
              size="small"
              placeholder={green[500]}
              sx={{ maxWidth: 120 }}
            />
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
};

export default Settings;
