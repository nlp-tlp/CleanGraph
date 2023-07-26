import { useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Stack,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  MenuItem,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import AutoFixNormalIcon from "@mui/icons-material/AutoFixNormal";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LoadingButton from "@mui/lab/LoadingButton";
import Editor from "./Editor";
import { DummyData } from "../../shared/data";
import HelpCenterIcon from "@mui/icons-material/HelpCenter";
import { SnackbarContext } from "../../shared/snackbarContext";
import { getPlugins, createGraph } from "../../shared/api";

const MAX_ONTOLOGY_ITEM_COUNT = 10;
const INITIAL_STATE = {
  name: "",
  filename: null,
  data: "",
  nodeClasses: [],
  edgeClasses: [],
  models: { cm: null, edm: null },
};
const INITIAL_METRIC_STATE = { items: 0 };

const NO_DATA_MESSAGE = "Nothing uploaded or entered";

const CreateGraph = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [values, setValues] = useState({ ...INITIAL_STATE });
  const [metrics, setMetrics] = useState({ ...INITIAL_METRIC_STATE });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const valid = errors.length === 0 && values.name !== "";
  const [plugins, setPlugins] = useState();
  const { openSnackbar } = useContext(SnackbarContext);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const response = await getPlugins();
        if (response.status === 200) {
          setPlugins(response.data);
        } else {
          throw new Error();
        }
      } catch (error) {
        openSnackbar("error", "Error", "Failed to fetch plugins");
      }
    };

    if (!plugins) {
      fetchPlugins();
    }
  }, [plugins]);

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const response = await createGraph({
        name: values.name,
        node_classes: values.nodeClasses,
        edge_classes: values.edgeClasses,
        filename: values.filename,
        plugins: values.models,
        triples: JSON.parse(values.data),
      });

      if (response.status === 200) {
        navigate(`/${response.data.id}`);
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", `Unable to create graph`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setValues(INITIAL_STATE);
    setMetrics(INITIAL_METRIC_STATE);
  };

  function formatList(list, maxItems) {
    if (list.length <= maxItems) {
      return list.join(", ");
    } else {
      return (
        list.slice(0, maxItems).join(", ") + `, +${list.length - maxItems} more`
      );
    }
  }

  useEffect(() => {
    if (errors.length === 0 && values.data !== "") {
      try {
        const json = JSON.parse(values.data);

        const fieldsToCheck = ["head_type", "tail_type"];

        const doesNotHaveNodeClasses = json.every((obj) =>
          fieldsToCheck.every((field) => !obj.hasOwnProperty(field))
        );
        let nodeClasses = [];
        if (doesNotHaveNodeClasses) {
          nodeClasses = ["undefined"];
        } else {
          nodeClasses = [
            ...new Set(json.flatMap((t) => [t.head_type, t.tail_type])),
          ];
        }

        const edgeClasses = [...new Set(json.map((t) => t.relation))];

        setValues((prevState) => ({
          ...prevState,
          nodeClasses,
          edgeClasses,
        }));
      } catch (error) {
        // Unable to parse; may be invalid.
      }
    }
  }, [values.data, errors]);

  const handlePopulateDummyGraph = () => {
    setValues({
      ...INITIAL_STATE,
      name: "Dummy Graph",
      data: JSON.stringify(DummyData),
    });
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        as={Paper}
        elevation={2}
        sx={{
          width: 1200,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box p={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="column">
              <Typography variant="h5" gutterBottom>
                New Graph
              </Typography>
              <Typography variant="caption">
                Create a graph by entering the details below
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Click to generate example graph">
                <IconButton onClick={handlePopulateDummyGraph}>
                  <AutoFixNormalIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Click to clear the entire form">
                <IconButton onClick={handleClear}>
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Click to visit the documentation">
                <IconButton>
                  <HelpCenterIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
        <Divider />
        <Box p={2} display="flex" direction="row">
          <Stack
            direction="column"
            spacing={2}
            p="0.5rem 0.5rem"
            sx={{ width: 360 }}
          >
            <Tooltip
              title="Enter a distinct name for your graph"
              placement="left"
            >
              <TextField
                label="Graph Name"
                value={values.name}
                onChange={(e) =>
                  setValues((prevState) => ({
                    ...prevState,
                    name: e.target.value,
                  }))
                }
              />
            </Tooltip>
            <Box>
              <Tooltip
                title="Select a model to detect graph errors"
                placement="left"
              >
                <TextField
                  label="Error Detection Model"
                  placeholder="Select model"
                  select
                  fullWidth
                  value={values.models.edm}
                  onChange={(e) =>
                    setValues((prevState) => ({
                      ...prevState,
                      models: { ...prevState.models, edm: e.target.value },
                    }))
                  }
                >
                  <MenuItem key="no-model" value={""}>
                    No Model
                  </MenuItem>
                  {plugins?.edm?.map((m) => (
                    <MenuItem key={`edm-plugin-${m}`} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              </Tooltip>
            </Box>
            <Box>
              <Tooltip
                title="Select a model for graph completion"
                placement="left"
              >
                <TextField
                  label="Completion Model"
                  placeholder="Select model"
                  select
                  fullWidth
                  value={values.models.cm}
                  onChange={(e) =>
                    setValues((prevState) => ({
                      ...prevState,
                      models: { ...prevState.models, cm: e.target.value },
                    }))
                  }
                >
                  <MenuItem key="no-model" value={""}>
                    No Model
                  </MenuItem>
                  {plugins?.cm?.map((m) => (
                    <MenuItem key={`cm-plugin-${m}`} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              </Tooltip>
            </Box>
            <>
              <Box>
                <Typography fontWeight={700}>Triples</Typography>
                <Typography variant="caption">
                  {metrics.items > 0
                    ? `${metrics.items} triples ${
                        values.filename ? "uploaded" : "entered"
                      }`
                    : NO_DATA_MESSAGE}
                </Typography>
              </Box>
              <Box>
                <Typography fontWeight={700}>Entity Classes</Typography>
                <Typography variant="caption">
                  {values.nodeClasses.length > 0
                    ? formatList(values.nodeClasses, MAX_ONTOLOGY_ITEM_COUNT)
                    : NO_DATA_MESSAGE}
                </Typography>
              </Box>
              <Box>
                <Typography fontWeight={700}>Relation Classes</Typography>
                <Typography variant="caption">
                  {values.edgeClasses.length > 0
                    ? formatList(values.edgeClasses, MAX_ONTOLOGY_ITEM_COUNT)
                    : NO_DATA_MESSAGE}
                </Typography>
              </Box>
            </>
          </Stack>
          <Box sx={{ width: "100%" }} p="0.5rem 0.5rem">
            <Editor
              values={values}
              setValues={setValues}
              errors={errors}
              setErrors={setErrors}
              setMetrics={setMetrics}
              initialMetricState={INITIAL_METRIC_STATE}
            />
          </Box>
        </Box>
        <Box
          display="flex"
          justifyContent="right"
          sx={{ bgcolor: theme.palette.primary.light }}
          p={2}
        >
          <Stack direction="row" justifyContent="center" spacing={2}>
            <Button
              component={Link}
              to="/home"
              variant="outlined"
              sx={{ bgcolor: "white", color: theme.palette.primary.dark }}
              disableElevation
            >
              Return
            </Button>
            <LoadingButton
              variant="contained"
              onClick={handleCreate}
              disabled={!valid}
              loading={submitting}
              disableElevation
              sx={{ color: theme.palette.primary.light }}
            >
              Create
            </LoadingButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default CreateGraph;
