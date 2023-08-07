// TODO: virtualize...

// User wants to add new node
// - Select existing edge

import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import { getGraphItems, addGraphItem } from "../../shared/api";
import { useParams } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import CircleIcon from "@mui/icons-material/Circle";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { SnackbarContext } from "../../shared/snackbarContext";
import LoadingButton from "@mui/lab/LoadingButton";
import { GraphContext } from "../../shared/context";

const isValid = (obj) =>
  Object.values(obj).every((v) =>
    typeof v === "object" ? isValid(v) : v && v.trim()
  );

const INITIAL_STATE = {
  head: { name: "", type: "" },
  edge: "",
  tail: { name: "", type: "" },
};

const AddGraphItem = ({ handleClose }) => {
  const [state, dispatch] = useContext(GraphContext);
  const { graphId } = useParams();
  const { openSnackbar } = useContext(SnackbarContext);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState(INITIAL_STATE);
  const [data, setData] = useState({
    nodeNames: [],
    nodeTypes: [],
    edgeTypes: [],
  });
  const [valid, setValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch graph nodes/edges for user to select from.
    const fetchGraphItems = async () => {
      try {
        const response = await getGraphItems(graphId);

        if (response.status === 200) {
          setData({
            nodeNames: response.data.node_names,
            nodeTypes: response.data.node_types,
            edgeTypes: response.data.edge_types,
          });
          setLoading(false);
        } else {
          throw new Error();
        }
      } catch (error) {
      } finally {
      }
    };

    if (loading) {
      fetchGraphItems();
    }
  }, [loading]);

  const handleReset = () => {
    // Reset form
    setValues(INITIAL_STATE);
  };

  const handleAddItem = async () => {
    // User adds item, if structure already exists, returns error otherwise adds to graph and renders the graph on the "head" of the new item.
    // 1. Triple already exists, cannot be added.
    // 2. Triple can be added, add.
    console.log("add payload", values);

    setSubmitting(true);
    try {
      if (
        values.head.name === values.tail.name &&
        values.head.type === values.tail.type
      ) {
        // TODO: Alert if user has identical head/tail, cannot have self-referencing...
        throw new Error("Self-referencing triples are not supported");
      } else {
        const payload = {
          head_name: values.head.name,
          head_type: values.head.type,
          edge: values.edge,
          tail_name: values.tail.name,
          tail_type: values.tail.type,
        };

        console.log("new triple payload", payload);
        const response = await addGraphItem(graphId, payload);

        if (response.status === 200) {
          if (response.data.triple_exists) {
            throw new Error("Triple already exists in graph.");
          } else {
            // Either add item into current graph view or redirect to new subgraph (source)
            if (
              Object.keys(response.data.nodes).includes(state.centralNodeId)
            ) {
              // Update current graph as the central node is being updated...
              alert("Central node updated...");
            } else {
              alert("Redirecting to new subgraph...");
            }

            openSnackbar("success", "Success", "New triple created!");
          }
        }
      }
    } catch (error) {
      openSnackbar("error", "Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setValid(isValid(values));
  }, [values]);

  return (
    <Box width={600}>
      <Box p="1rem 2rem">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="column">
            <Typography variant="h6">Add Item</Typography>
            <Typography variant="caption">
              If you wish to add items with new classes, please create the class
              first. If the head node is not the current subgraphs central node,
              you will be redirected on creation.
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
      <Box p={2}>
        {loading ? (
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="center"
            p={2}
          >
            <CircularProgress size={18} />
            <Typography>Loading...</Typography>
          </Stack>
        ) : (
          <>
            <AddItemComponent
              data={data}
              values={values}
              setValues={setValues}
            />
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="right"
              spacing={1}
              mt={2}
            >
              <Button variant="outlined" onClick={handleReset}>
                Reset
              </Button>
              <LoadingButton
                variant="contained"
                disabled={!valid}
                onClick={handleAddItem}
                loading={submitting}
              >
                Add
              </LoadingButton>
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
};

const AddItemComponent = ({ data, values, setValues }) => {
  return (
    <Stack direction="column" spacing={2}>
      <NodeFormComponent
        isHead={true}
        data={data}
        values={values}
        setValues={setValues}
      />
      <EdgeFormComponent data={data} values={values} setValues={setValues} />
      <NodeFormComponent
        isHead={false}
        data={data}
        values={values}
        setValues={setValues}
      />
    </Stack>
  );
};

const NodeAutoComplete = ({ context, existingNodeNames, value, setValue }) => {
  return (
    <Autocomplete
      freeSolo
      autoHighlight
      value={value}
      onChange={(event, newValue) => {
        if (newValue) {
          setValue(newValue);
        } else {
          setValue("");
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={`${context} Name`}
          placeholder="Select or type name"
        />
      )}
      options={existingNodeNames}
    />
  );
};

const NodeFormComponent = ({ isHead, data, values, setValues }) => {
  const name = isHead ? "Head" : "Tail";
  const key = isHead ? "head" : "tail";

  const setName = (newName) => {
    setValues((prevState) => ({
      ...prevState,
      [key]: { ...prevState[key], name: newName },
    }));
  };

  const handleClassChange = (event) => {
    setValues((prevState) => ({
      ...prevState,
      [key]: { ...prevState[key], type: event.target.value },
    }));
  };

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <CircleIcon />
      <Box width={400}>
        <NodeAutoComplete
          context={name}
          existingNodeNames={data.nodeNames.sort((a, b) => a.localeCompare(b))}
          value={values[key].name}
          setValue={setName}
        />
      </Box>
      <TextField
        select
        label={`${name} Class`}
        fullWidth
        onChange={handleClassChange}
        value={values[key].type}
      >
        {data.nodeTypes
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((n) => (
            <MenuItem value={n._id} key={n._id}>
              {n.name}
            </MenuItem>
          ))}
      </TextField>
    </Stack>
  );
};

const EdgeFormComponent = ({ data, values, setValues }) => {
  const handleClassSelect = (event) => {
    setValues((prevState) => ({ ...prevState, edge: event.target.value }));
  };

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <HorizontalRuleIcon />
      <TextField
        label="Edge Class"
        fullWidth
        select
        onChange={handleClassSelect}
        value={values.edge}
      >
        {data.edgeTypes
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((e) => (
            <MenuItem value={e._id} key={e._id}>
              {e.name}
            </MenuItem>
          ))}
      </TextField>
    </Stack>
  );
};

export default AddGraphItem;
