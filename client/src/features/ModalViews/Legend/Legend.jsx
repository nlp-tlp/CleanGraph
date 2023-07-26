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
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { GraphContext } from "../../../shared/context";
import { lightBlue, orange } from "@mui/material/colors";
import CloseIcon from "@mui/icons-material/Close";
import CircleIcon from "@mui/icons-material/Circle";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { TriangleIcon } from "../../PrimarySidebar/Subgraphs";
import { LegendIcons } from "./LegendIcons";
import AddItemModal from "./AddItemModal";
import EditIcon from "@mui/icons-material/Edit";
import EditItemModal from "./EditItemModal";

const StackedIcon = ({ IconComponent, caption, triangleProps }) => (
  <Stack direction="column" alignItems="center" spacing={1}>
    {triangleProps ? <TriangleIcon {...triangleProps} /> : <IconComponent />}
    <Typography variant="caption" style={{ textAlign: "center" }}>
      {caption}
    </Typography>
  </Stack>
);

const Legend = ({ handleClose }) => {
  const [state] = useContext(GraphContext);
  const entities = state.ontology.nodes;
  const relations = state.ontology.edges;

  const [showModal, setShowModal] = useState(false);
  const handleModalOpen = () => setShowModal(true);
  const handleModalClose = () => setShowModal(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const handleEditModalOpen = (item) => {
    setEditItem(item);
    setShowEditModal(true);
  };
  const handleEditModalClose = () => {
    setEditItem();
    setShowEditModal(false);
  };

  const [editItem, setEditItem] = useState();

  return (
    <Box>
      {showModal && (
        <AddItemModal
          openModal={showModal}
          handleModalClose={handleModalClose}
        />
      )}
      {showEditModal && (
        <EditItemModal
          openModal={showEditModal}
          handleModalClose={handleEditModalClose}
          item={editItem}
        />
      )}
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
          <Tooltip title="Click to close">
            <IconButton onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Divider flexItem />
      <Box p="1rem 2rem">
        <Typography fontWeight={600} mb={1}>
          Graph
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="left"
          spacing={2}
        >
          <StackedIcon
            IconComponent={LegendIcons.Edge.Reviewed}
            caption="Edge (Reviewed)"
          />
          <StackedIcon
            IconComponent={LegendIcons.Edge.Unreviewed}
            caption="Edge (Unreviewed)"
          />
          <StackedIcon
            IconComponent={LegendIcons.Edge.Focused}
            caption="Edge (Focused)"
          />
          <StackedIcon
            IconComponent={LegendIcons.Node.Reviewed}
            caption="Node (Reviewed)"
          />
          <StackedIcon
            IconComponent={LegendIcons.Node.Unreviewed}
            caption="Node (Unreviewed)"
          />
          <StackedIcon
            IconComponent={LegendIcons.Node.Focused}
            caption="Node (Focused)"
          />
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="left"
          spacing={2}
        >
          <StackedIcon
            triangleProps={{
              context: "error",
              number: "1",
              fillColor: orange[300],
              strokeColor: orange[500],
            }}
            caption="Error"
          />
          <StackedIcon
            triangleProps={{
              context: "suggestion",
              number: "1",
              fillColor: lightBlue[300],
              strokeColor: lightBlue[500],
            }}
            caption="Suggestion"
          />
        </Stack>
      </Box>
      <Box
        display="flex"
        p={2}
        flexDirection="column"
        justifyContent="space-evenly"
      >
        <Box p="0rem 1rem" mb={2}>
          <Typography fontWeight={600} mb={1}>
            Node Classes ({entities.length})
          </Typography>
          <Box sx={{ height: 160, overflowY: "auto" }}>
            <List dense>
              {entities
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((e, index) => (
                  <ListItem
                    key={`entity-${index}`}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        size="small"
                        onClick={() =>
                          handleEditModalOpen({ ...e, isNode: true })
                        }
                      >
                        <Tooltip title={`Click to edit ${e.name}`}>
                          <EditIcon />
                        </Tooltip>
                      </IconButton>
                    }
                  >
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
            Edge Classes ({relations.length})
          </Typography>
          <Box sx={{ height: 160, overflowY: "auto" }}>
            <List dense>
              {relations
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((r, index) => (
                  <ListItem
                    key={`relation-${index}`}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        size="small"
                        onClick={() =>
                          handleEditModalOpen({ ...r, isNode: false })
                        }
                      >
                        <Tooltip title={`Click to edit ${r.name}`}>
                          <EditIcon />
                        </Tooltip>
                      </IconButton>
                    }
                  >
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
      <Divider flexItem />
      <Box
        p="1rem 2rem"
        display="flex"
        alignItems="center"
        justifyContent="right"
      >
        <Tooltip title="Click to add a new class">
          <Button variant="contained" size="small" onClick={handleModalOpen}>
            Add Class
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Legend;
