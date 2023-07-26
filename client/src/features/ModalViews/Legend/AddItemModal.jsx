import { purple } from "@mui/material/colors";
import React, { useContext, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { GraphContext } from "../../../shared/context";
import { SnackbarContext } from "../../../shared/snackbarContext";
import { addClass } from "../../../shared/api";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Modal,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { CompactPicker } from "react-color";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";
import PaletteIcon from "@mui/icons-material/Palette";
import CloseIcon from "@mui/icons-material/Close";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  maxHeight: 600,
  bgcolor: "background.paper",
  border: "2px solid",
  borderColor: "lightgrey",
  boxShadow: 24,
  p: 0,
  display: "flex",
  flexDirection: "column",
  borderRadius: 4,
};

const initialAddItemState = {
  name: "",
  color: purple[500],
  isNode: true,
};

const AddItemModal = ({ openModal, handleModalClose }) => {
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const { graphId } = useParams();
  const [anchorEl, setAnchorEl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState(initialAddItemState.color);
  const [name, setName] = useState(initialAddItemState.name);
  const [isNode, setIsNode] = useState(initialAddItemState.isNode);

  const nodeClassNames = useMemo(
    () => state.ontology.nodes.map((i) => i.name.toLowerCase()),
    [state.ontology.nodes]
  );
  const edgeClassNames = useMemo(
    () => state.ontology.edges.map((i) => i.name.toLowerCase()),
    [state.ontology.edges]
  );

  const valid =
    name !== "" &&
    color !== "" &&
    !(isNode ? nodeClassNames : edgeClassNames).includes(name.toLowerCase());

  const handleColorClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleReset = () => {
    setName(initialAddItemState.name);
    setColor(initialAddItemState.color);
    setIsNode(initialAddItemState.isNode);
  };

  const open = Boolean(anchorEl);
  const id = open ? "color-picker-popover" : undefined;

  const handleAddClass = async () => {
    try {
      // Call API
      setSubmitting(true);
      const response = await addClass(graphId, isNode, name, color);

      if (response.status === 200) {
        if (response.data.classes_modified) {
          dispatch({
            type: "ADD_CLASS_ITEM",
            payload: { newClass: response.data.new_class, isNode: isNode },
          });
          handleReset();
          handleModalClose();
          openSnackbar(
            "success",
            "Success",
            `Successfully added ${isNode ? "node" : "edge"} class`
          );
        } else {
          throw new Error();
        }
      } else {
        throw new Error();
      }

      // Dispatch class and update legend items.. (node/edge classes)
    } catch (error) {
      openSnackbar(
        "error",
        "Error",
        `Unable to add new ${isNode ? "node" : "edge"} class`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={openModal}
      onClose={handleModalClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={modalStyle} p={0} m={0}>
        <Box p="1rem 2rem">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="column">
              <Typography variant="h6">Add Class</Typography>
              <Typography variant="caption">
                Add a new node or edge class
              </Typography>
            </Stack>
            <Stack direction="row">
              <IconButton onClick={handleModalClose}>
                <Tooltip title="Click to close">
                  <CloseIcon fontSize="small" />
                </Tooltip>
              </IconButton>
            </Stack>
          </Stack>
        </Box>
        <Divider flexItem />
        <Box p="1rem 2rem">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Stack direction="column">
              <Typography variant="body1">Class Type</Typography>
              <Typography variant="caption">
                Is the new class an node or edge?
              </Typography>
            </Stack>
            <ToggleButtonGroup
              color="success" // TODO: fix primary theme.
              size="small"
              exclusive
              value={isNode}
              onChange={(e, newValue) => setIsNode(newValue)}
            >
              <ToggleButton value={true}>Node</ToggleButton>
              <ToggleButton value={false}>Edge</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Stack direction="column">
              <Typography variant="body1">Name</Typography>
              <Typography variant="caption">
                What is the name of the new class?
              </Typography>
            </Stack>
            <TextField
              sx={{ maxWidth: 160 }}
              size="small"
              placeholder="Enter class name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="column">
              <Typography variant="body1">Color</Typography>
              <Typography variant="caption">
                Select a color for the new class
              </Typography>
            </Stack>
            <IconButton onClick={handleColorClick}>
              <Tooltip title="Click to select a color">
                <PaletteIcon sx={{ color: color }} />
              </Tooltip>
            </IconButton>
            <Popover
              id={id}
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <CompactPicker
                color={color}
                onChangeComplete={(e) => setColor(e.hex)}
              />
            </Popover>
          </Stack>
        </Box>
        <Divider flexItem />
        <Box
          p="1rem 2rem"
          display="flex"
          justifyContent="right"
          alignItems="center"
        >
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" size="small" onClick={handleModalClose}>
              Cancel
            </Button>
            <LoadingButton
              variant="contained"
              size="small"
              disabled={!valid}
              loading={submitting}
              onClick={handleAddClass}
            >
              Create
            </LoadingButton>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
};

export default AddItemModal;
