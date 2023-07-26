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
  Popover,
} from "@mui/material";
import React, { useContext, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { GraphContext } from "../../shared/context";
import _ from "lodash";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";
import { updateSettings } from "../../shared/api";
import { useParams } from "react-router-dom";
import moment from "moment";
import { SnackbarContext } from "../../shared/snackbarContext";
import { CompactPicker } from "react-color";
import PaletteIcon from "@mui/icons-material/Palette";

const Settings = ({ handleClose }) => {
  const [state, dispatch] = useContext(GraphContext);
  const { graphId } = useParams();
  const { openSnackbar } = useContext(SnackbarContext);
  const [values, setValues] = useState({ ...state.settings });
  const valuesChanged = !_.isEqual(state.settings, values);
  const [submitting, setSubmitting] = useState(false);

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const response = await updateSettings(graphId, values);
      if (response.status === 200) {
        dispatch({ type: "UPDATE_SETTINGS", payload: values });
        openSnackbar("success", "Success", "Successfully updated settings");
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Failed to update settings");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setValues({ ...state.settings });
  };

  return (
    <Box>
      <Box p="1rem 2rem">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="column">
            <Typography variant="h6">Settings</Typography>
            <Typography variant="caption">
              View or update CleanGraph visualisation settings
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
      <Box p="2rem 2rem 0rem 2rem" sx={{ height: 440, overflowY: "auto" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column" pr={2}>
            <Typography variant="body1">Show Errors</Typography>
            <Typography variant="caption">
              Toggle whether graph errors should be displayed across CleanGraph
              e.g. icons, elements, etc
            </Typography>
          </Stack>
          <ToggleButtonGroup
            color="success" // TODO: Fix primary theme...
            size="small"
            exclusive
            value={values?.display_errors ?? false}
            onChange={(e, newValue) =>
              setValues((prevState) => ({
                ...prevState,
                display_errors: newValue,
              }))
            }
          >
            <ToggleButton value={false}>
              <Tooltip title="Click to toggle errors off">
                <VisibilityOffIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={true}>
              <Tooltip title="Click to toggle errors on">
                <VisibilityIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column" pr={2}>
            <Typography variant="body1">Show Suggestions</Typography>
            <Typography variant="caption">
              Toggle whether graph suggestions should be displayed across
              CleanGraph e.g. icons, elements, etc
            </Typography>
          </Stack>
          <ToggleButtonGroup
            color="success" // TODO: Fix primary theme...
            size="small"
            exclusive
            value={values?.display_suggestions ?? false} // TODO: update state/api to provide persistent settings.
            onChange={(e, newValue) =>
              setValues((prevState) => ({
                ...prevState,
                display_suggestions: newValue,
              }))
            }
          >
            <ToggleButton value={false}>
              <Tooltip title="Click to toggle suggestions off">
                <VisibilityOffIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={true}>
              <Tooltip title="Click to toggle suggestions on">
                <VisibilityIcon />
              </Tooltip>
            </ToggleButton>
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
              Toggle whether graph edge labels should be displayed. Turning this
              off will color the edges.
            </Typography>
          </Stack>
          <ToggleButtonGroup
            color="success"
            size="small"
            exclusive
            value={values?.graph?.display_edge_labels ?? false} // TODO: update state/api to provide persistent settings.
            onChange={(e, newValue) =>
              setValues((prevState) => ({
                ...prevState,
                graph: { ...prevState.graph, display_edge_labels: newValue },
              }))
            }
          >
            <ToggleButton value={false}>
              <Tooltip title="Click to toggle edge labels off">
                <VisibilityOffIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={true}>
              <Tooltip title="Click to toggle edge labels on">
                <VisibilityIcon />
              </Tooltip>
            </ToggleButton>
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
            color="success" // TODO: Fix primary theme...
            size="small"
            exclusive
            value={values?.graph?.node_size ?? "medium"} // TODO: update state/api to provide persistent settings.
            onChange={(e, newValue) =>
              setValues((prevState) => ({
                ...prevState,
                graph: { ...prevState.graph, node_size: newValue },
              }))
            }
          >
            <ToggleButton value="small">
              <Tooltip title="Click to toggle small node sizes">Small</Tooltip>
            </ToggleButton>
            <ToggleButton value="medium">
              <Tooltip title="Click to toggle medium node sizes">
                Medium
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="large">
              <Tooltip title="Click to toggle large node sizes">Large</Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Stack direction="column">
            <Typography variant="body1">Graph Size</Typography>
            <Typography variant="caption">
              Select the number of subgraph triples to be displayed at once
            </Typography>
          </Stack>
          <ToggleButtonGroup
            color="success" // TODO: Fix primary theme...
            size="small"
            exclusive
            value={values?.graph?.limit ?? 10}
            onChange={(e, newValue) =>
              setValues((prevState) => ({
                ...prevState,
                graph: { ...prevState.graph, limit: newValue },
              }))
            }
          >
            {[5, 10, 25, 100].map((size) => (
              <ToggleButton value={size}>
                <Tooltip title={`Click to display ${size} triples at once`}>
                  {size}
                </Tooltip>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        {Object.keys(values.colors)
          .sort((a, b) => a.localeCompare(b))
          .map((colorName) => {
            return (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Stack direction="column">
                  <Typography
                    variant="body1"
                    sx={{ textTransform: "capitalize" }}
                  >
                    {colorName} Item Color
                  </Typography>
                  <Typography variant="caption">
                    Specify the color of {colorName} items
                  </Typography>
                </Stack>
                <ColorIconWithPicker
                  name={colorName}
                  values={values}
                  setValues={setValues}
                />
              </Stack>
            );
          })}
      </Box>
      <Divider flexItem />
      <Box p="1rem 2rem">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="caption">
            Last Updated: {moment.utc(state.graph.updatedAt).fromNow()}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              // variant="outlined"
              onClick={handleCancel}
              disabled={!valuesChanged}
            >
              Reset
            </Button>
            <LoadingButton
              variant="contained"
              disabled={!valuesChanged}
              loading={submitting}
              onClick={handleUpdate}
            >
              Update
            </LoadingButton>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

const ColorIconWithPicker = ({ name, values, setValues }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Popover
        id={`color-popover-${name}`}
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <CompactPicker
          color={values.colors[name]}
          onChangeComplete={(e) =>
            setValues((prevState) => ({
              ...prevState,
              colors: { ...prevState.colors, [name]: e.hex },
            }))
          }
        />
      </Popover>
      <IconButton onClick={handleClick}>
        <Tooltip title={`Specify the desired ${name} color`}>
          <PaletteIcon sx={{ color: values.colors[name] }} />
        </Tooltip>
      </IconButton>
    </>
  );
};

export default Settings;
