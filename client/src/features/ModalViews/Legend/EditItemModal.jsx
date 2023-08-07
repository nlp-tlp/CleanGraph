import React, { useContext, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { GraphContext } from "../../../shared/context";
import { SnackbarContext } from "../../../shared/snackbarContext";
import { updateClass } from "../../../shared/api";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Modal,
  Popover,
  Stack,
  TextField,
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

const EditItemModal = ({ openModal, handleModalClose, item }) => {
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const { graphId } = useParams();
  const [anchorEl, setAnchorEl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState(item.color);
  const [name, setName] = useState(item.name);

  const classType = item.isNode ? "node" : "edge";

  //   NOTE: existing class names does not include the current name.
  const nodeClassNames = useMemo(
    () =>
      state.ontology.nodes
        .filter((i) => i._id !== item._id)
        .map((i) => i.name.toLowerCase()),
    [state.ontology.nodes]
  );
  const edgeClassNames = useMemo(
    () =>
      state.ontology.edges
        .filter((i) => i._id !== item._id)
        .map((i) => i.name.toLowerCase()),
    [state.ontology.edges]
  );

  const valid =
    name !== "" &&
    color !== "" &&
    !(item.isNode ? nodeClassNames : edgeClassNames).includes(
      name.toLowerCase()
    ) &&
    (name !== item.name || color !== item.color);

  const handleColorClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleReset = () => {
    setName(item.name);
    setColor(item.color);
  };

  const open = Boolean(anchorEl);
  const id = open ? "color-picker-popover" : undefined;

  const handleEditClass = async () => {
    try {
      setSubmitting(true);
      const response = await updateClass(
        graphId,
        item.isNode,
        name,
        color,
        item._id
      );
      if (response.status === 200) {
        if (response.data.classes_modified) {
          dispatch({
            type: "UPDATE_CLASS_ITEM",
            payload: {
              updatedClass: { id: item._id, name: name, color: color },
              isNode: item.isNode,
            },
          });
          handleReset();
          handleModalClose();
          openSnackbar(
            "success",
            "Success",
            `Successfully updated ${item.isNode ? "node" : "edge"} class`
          );
        } else {
          throw new Error();
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar(
        "error",
        "Error",
        `Unable to update ${item.isNode ? "node" : "edge"} class`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={openModal}
      onClose={handleModalClose}
      aria-labelledby="edit-class-modal-title"
      aria-describedby="edit-class-description"
    >
      <Box sx={modalStyle} p={0} m={0}>
        <Box p="1rem 2rem">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" sx={{ textTransform: "capitalize" }}>
              Edit {classType} Class
            </Typography>
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
            <Typography variant="body1">Name</Typography>
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
            <Typography variant="body1">Color</Typography>
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
              onClick={handleEditClass}
            >
              Update
            </LoadingButton>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
};

export default EditItemModal;
