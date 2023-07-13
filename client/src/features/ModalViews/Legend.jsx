import React, { useContext, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Modal,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { GraphContext } from "../../shared/context";
import { BlockPicker } from "react-color";
import PaletteIcon from "@mui/icons-material/Palette";
import { grey, purple } from "@mui/material/colors";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CloseIcon from "@mui/icons-material/Close";
import CircleIcon from "@mui/icons-material/Circle";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import LoadingButton from "@mui/lab/LoadingButton";

const Legend = ({ handleClose }) => {
  const [state] = useContext(GraphContext);
  const entities = state.ontology.filter((i) => i.is_entity);
  const relations = state.ontology.filter((i) => !i.is_entity);

  const [showModal, setShowModal] = useState(false);
  const handleModalOpen = () => setShowModal(true);
  const handleModalClose = () => setShowModal(false);

  return (
    <Box>
      <AddItemModal openModal={showModal} handleModalClose={handleModalClose} />
      <Box p="1rem 2rem">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="column">
            <Typography variant="h6">Legend</Typography>
            <Typography variant="caption">
              Create, update or view entity and relation classes
            </Typography>
          </Stack>
          <Stack direction="row">
            <Tooltip title="Click to add a new item">
              <IconButton onClick={handleModalOpen}>
                <AddCircleIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Click to close">
              <IconButton onClick={handleClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
      <Divider flexItem />
      <Box>Legend items (halo, circle, error triangles) go here.</Box>
      <Box
        display="flex"
        p={2}
        flexDirection="column"
        justifyContent="space-evenly"
      >
        <Box p="0rem 1rem" mb={2}>
          <Typography fontWeight={600} mb={1}>
            Entity Classes ({entities.length})
          </Typography>
          <Box sx={{ height: 200, overflowY: "auto" }}>
            <List dense>
              {entities
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((e, index) => (
                  <ListItem key={`entity-${index}`}>
                    <ListItemIcon>
                      <CircleIcon sx={{ color: e.color }} />
                    </ListItemIcon>
                    <ListItemText>{e.name}</ListItemText>
                  </ListItem>
                ))}
            </List>
          </Box>
        </Box>
        <Box p="0rem 1rem">
          <Typography fontWeight={600} mb={1}>
            Relation Classes ({relations.length})
          </Typography>
          <Box sx={{ height: 200, overflowY: "auto" }}>
            <List dense>
              {relations
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((r, index) => (
                  <ListItem key={`relation-${index}`}>
                    <ListItemIcon>
                      <HorizontalRuleIcon sx={{ color: r.color }} />
                    </ListItemIcon>
                    <ListItemText>{r.name}</ListItemText>
                  </ListItem>
                ))}
            </List>
          </Box>
        </Box>
      </Box>
      {/* <Box>
        <Button>Add</Button>
      </Box> */}
    </Box>
  );
};

const AddItemModal = ({ openModal, handleModalClose }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [color, setColor] = useState(purple[500]);
  const [name, setName] = useState("");

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "color-picker-popover" : undefined;

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
                Add a new entity or relation class
              </Typography>
            </Stack>
            <Stack direction="row">
              <Tooltip title="Click to close">
                <IconButton onClick={handleModalClose}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
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
                Is the new class an entity or relation?
              </Typography>
            </Stack>
            <ToggleButtonGroup
              color="primary"
              size="small"
              exclusive
              // value={state.settings?.issuesVisible || false} // TODO: update state/api to provide persistent settings.
            >
              <Tooltip title="Click to select entity class">
                <ToggleButton value={true}>Entity</ToggleButton>
              </Tooltip>
              <Tooltip title="Click to select relation class">
                <ToggleButton value={false}>Relation</ToggleButton>
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
              <Typography variant="body1">Name</Typography>
              <Typography variant="caption">
                What is the name of the new class?
              </Typography>
            </Stack>
            <TextField
              sx={{ maxWidth: 160 }}
              size="small"
              placeholder="Enter name"
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
                What is the color of the new item?
              </Typography>
            </Stack>
            <TextField
              sx={{ maxWidth: 160 }}
              size="small"
              placeholder={grey[500]}
            />
          </Stack>
          {/* <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Click to select a color">
              <IconButton onClick={handleClick}>
                <PaletteIcon />
              </IconButton>
            </Tooltip>
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
              <BlockPicker />
            </Popover>
          </Stack> */}
        </Box>
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
            <LoadingButton variant="contained" size="small">
              Create
            </LoadingButton>
          </Stack>
        </Box>
      </Box>
    </Modal>
  );
};

export default Legend;
