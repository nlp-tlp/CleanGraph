import "./Styles.css";
import { useState, useContext, useEffect } from "react";
import {
  Button,
  Box,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  Divider,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { grey, blue } from "@mui/material/colors";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import SortIcon from "@mui/icons-material/Sort";
import MergeIcon from "@mui/icons-material/Merge";
import { GraphContext } from "../shared/context";
import axios from "axios";
import { useParams } from "react-router-dom";

const EditTray = () => {
  const { graphId } = useParams();
  const [state, dispatch] = useContext(GraphContext);

  const handleSubGraphFilter = async (nodeId) => {
    await axios.get(`/graphs/${graphId}/${nodeId}`).then((res) => {
      dispatch({
        type: "SET_VALUE",
        payload: { key: "data", value: res.data },
      });
      dispatch({
        type: "SET_VALUE",
        payload: { key: "currentNode", value: res.data.node },
      });
      dispatch({
        type: "SET_VALUE",
        payload: { key: "centralNode", value: res.data.node },
      });
      dispatch({
        type: "SET_VALUE",
        payload: { key: "maxTriples", value: res.data.max_triples },
      });
    });
  };

  return (
    <>
      <Typography variant="h5" p={2}>
        {state.graph.name}
      </Typography>
      <Divider />
      <Box p={2}>
        <Typography sx={{ fontWeight: 700 }}>Overview</Typography>
        <Stack direction="row" alignItems="center">
          <Typography>
            Triplets{" "}
            {state.originalData ? state.originalData["links"].length : "0"}
          </Typography>
          <ArrowRightAltIcon />
          <Typography>
            {state.data
              ? state.data["links"].filter((l) => l.active).length
              : "0"}
          </Typography>
        </Stack>
        <Stack>
          <Typography>
            Reviewed: {state.reviewed ? state.reviewed.links.length : 0}
          </Typography>
        </Stack>
      </Box>
      <Divider />
      <Box p={2}>
        <Inspector />
      </Box>
      <Divider />
      <Box p={2} sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {state.subgraphs.length > 0 && (
          <>
            <Typography sx={{ fontWeight: 700 }}>
              Subgraphs ({state.subgraphs.length})
            </Typography>
            <Stack direction="row" justifyContent="space-between">
              <Button
                title="Merge subgraphs"
                startIcon={<MergeIcon />}
                size="small"
                sx={{ fontSize: "0.75rem", color: grey[700], fontWeight: 700 }}
                disabled
              >
                Merge
              </Button>
              <Stack direction="row" justifyContent="right" alignItems="center">
                <IconButton
                  title="Sort alphabetically"
                  onClick={() =>
                    dispatch({
                      type: "SORT_SUBGRAPHS",
                      payload: {
                        sortType: "alpha",
                        sortDescending: !state.sortDescending,
                      },
                    })
                  }
                >
                  <SortByAlphaIcon />
                </IconButton>
                <IconButton
                  title="Sort by degree"
                  onClick={() =>
                    dispatch({
                      type: "SORT_SUBGRAPHS",
                      payload: {
                        sortType: "degree",
                        sortDescending: !state.sortDescending,
                      },
                    })
                  }
                >
                  <SortIcon />
                </IconButton>
              </Stack>
            </Stack>

            <List dense sx={{ maxHeight: "600px", overflowY: "scroll" }}>
              {state.subgraphs.map((sg) => {
                const labelId = `checkbox-list-secondary-label-${sg.id}`;
                return (
                  <ListItem
                    key={sg.id}
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        // onChange={() => handleToggle(sg.id)}
                        // checked={checked.indexOf(sg.id) !== -1}
                        inputProps={{ "aria-labelledby": labelId }}
                      />
                    }
                    disablePadding
                    sx={{
                      background:
                        state.centralNode &&
                        sg.id == state.centralNode.id &&
                        blue[200],
                      color:
                        state.centralNode &&
                        sg.id == state.centralNode.id &&
                        "black",
                    }}
                  >
                    <ListItemButton onClick={() => handleSubGraphFilter(sg.id)}>
                      <ListItemText
                        id={labelId}
                        primary={`${sg.name} (${sg.value})`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </Box>
    </>
  );
};

const Inspector = () => {
  const [state, dispatch] = useContext(GraphContext);
  const [nodeName, setNodeName] = useState(state.currentNode.name);
  const [nodeType, setNodeType] = useState(state.currentNode.type);

  const nodeChanged =
    nodeName !== state.currentNode.name || nodeType !== state.currentNode.type;

  useEffect(() => {
    setNodeName(state.currentNode.name);
    setNodeType(state.currentNode.type);
  }, [state.currentNode]);

  // Defaults to central node but will switch based on left click action on nodes.

  const handleUpdate = (nodeId) => {
    axios.patch(`/graphs/node/${nodeId}`, {
      name: nodeName,
      type: state.ontologyName2Id[nodeType],
      is_active: state.currentNode.is_active,
      is_reviewed: state.currentNode.is_reviewed,
    });
  };

  return (
    <>
      <Typography sx={{ fontWeight: 700 }}>Information</Typography>
      {state.currentNode && (
        <Stack
          direction="column"
          alignItems="center"
          justifyContent="center"
          mt={1}
          p={1}
          spacing={2}
        >
          <TextField
            label="Label"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            helperText="Change the nodes label/name"
            required
            variant="outlined"
            size="small"
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="class-type-select-label">Class</InputLabel>
            <Select
              labelId="class-type-select-label"
              id="class-type-select"
              label="Class"
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value)}
              size="small"
            >
              {state.ontology
                .filter((i) => i.is_entity)
                .map((i) => (
                  <MenuItem value={i.name} key={i.id}>
                    {i.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", justifyContent: "right", width: "100%" }}>
            <Button
              variant="contained"
              size="small"
              disabled={!nodeChanged}
              onClick={() => handleUpdate(state.currentNode.id)}
            >
              Update
            </Button>
          </Box>
        </Stack>
      )}
    </>
  );
};

export default EditTray;
