import "../App.css";
import { useState, useContext, useEffect } from "react";
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
import { GraphContext } from "../shared/context";
import { Link } from "react-router-dom";
import axios from "axios";
import AutoFixNormalIcon from "@mui/icons-material/AutoFixNormal";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { DataGrid } from "@mui/x-data-grid";
import Papa from "papaparse";
import PostAddIcon from "@mui/icons-material/PostAdd";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { useNavigate } from "react-router-dom";
import LoadingButton from "@mui/lab/LoadingButton";
import { ExampleRows } from "../shared/data";

const MAX_ONTOLOGY_ITEM_COUNT = 25;

const columns = [
  {
    field: "id",
    headerName: "ID",
    headerAlign: "center",
  },
  {
    field: "head",
    headerName: "Head",
    headerAlign: "center",
    align: "center",
    flex: 1,
    renderHeader: (params) => (
      <strong style={{ color: "rgba(0,0,0,0.75)" }}>Head</strong>
    ),
  },
  {
    field: "headType",
    headerName: "Head Type",
    headerAlign: "center",
    align: "center",
    flex: 1,
    renderHeader: (params) => (
      <strong style={{ color: "rgba(0,0,0,0.75)" }}>Head Type</strong>
    ),
  },
  {
    field: "relation",
    headerName: "Relation",
    headerAlign: "center",
    align: "center",
    flex: 1,
    renderHeader: (params) => (
      <strong style={{ color: "rgba(0,0,0,0.75)" }}>Relation</strong>
    ),
  },
  {
    field: "tail",
    headerName: "Tail",
    headerAlign: "center",
    align: "center",
    flex: 1,
    renderHeader: (params) => (
      <strong style={{ color: "rgba(0,0,0,0.75)" }}>Tail</strong>
    ),
  },
  {
    field: "tailType",
    headerName: "Tail Type",
    headerAlign: "center",
    align: "center",
    flex: 1,
    renderHeader: (params) => (
      <strong style={{ color: "rgba(0,0,0,0.75)" }}>Tail Type</strong>
    ),
  },
];

function CustomNoRowsOverlay() {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      height="100%"
    >
      <Typography variant="subtitle2">No Rows</Typography>
    </Box>
  );
}

const CreateGraph = () => {
  const [state, dispatch] = useContext(GraphContext);
  const theme = useTheme();
  let navigate = useNavigate();
  const [name, setName] = useState("");
  const [entityOntology, setEntityOntology] = useState([]);
  const [relationOntology, setRelationOntology] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorModel, setErrorModel] = useState("");
  const [completionModel, setCompletionModel] = useState("");

  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fileUploaded = rows.length > 0;
  const valid = rows.length > 0 && name !== "";

  const [plugins, setPlugins] = useState();

  useEffect(() => {
    const fetchPlugins = async () => {
      const response = await axios.get("/plugins/");

      try {
        if (response.status === 200) {
          setPlugins(response.data);
        }
      } catch (error) {
        console.log("Unable to fetch plugins");
      }
    };

    if (!plugins) {
      fetchPlugins();
    }
  }, [plugins]);

  const handleCreate = async () => {
    setSubmitting(true);

    const payloadOntology = [
      ...entityOntology.map((e) => ({ name: e, is_entity: true })),
      ...relationOntology.map((r) => ({ name: r, is_entity: false })),
    ];
    try {
      const response = await axios.post("/graph/", {
        graph: { name: name },
        ontology: payloadOntology,
        triples: rows.map((r) => ({
          subj: r.head,
          subj_type: r.headType,
          rel: r.relation,
          obj: r.tail,
          obj_type: r.tailType,
        })),
      });

      if (response.status !== 200) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      navigate(`/${response.data.id}`);
    } catch (error) {
      console.error(`Error occurred during graph creation: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePopulateExampleGraph = () => {
    // Populates fields with example graph data.
    setName((Math.random() + 1).toString(36).substring(7));
    setRows(
      ExampleRows.map((r, index) => ({
        id: index,
        head: r[0],
        headType: r[1],
        relation: r[2],
        tail: r[3],
        tailType: r[4],
      }))
    );
    setEntityOntology([...new Set(ExampleRows.flatMap((r) => [r[1], r[4]]))]);
    setRelationOntology([...new Set(ExampleRows.flatMap((r) => r[2]))]);
    setFileName("example.csv");
  };

  const handleClear = () => {
    setName("");
    setEntityOntology("");
    setRelationOntology("");
    setRows([]);
    setFileName("");
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      setLoading(true);

      Papa.parse(file, {
        header: true,
        complete: function (results) {
          console.log("Finished:", results.data);
          setLoading(false);
        },
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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

  const handleCSVChange = (event) => {
    let file = event.target.files[0];
    setFileName(file.name);

    setLoading(true); // set loading to true before starting the parse

    Papa.parse(event.target.files[0], {
      header: false,
      complete: function (results) {
        setRows(
          results.data.map((r, index) => ({
            id: index,
            head: r[0],
            headType: r[1],
            relation: r[2],
            tail: r[3],
            tailType: r[4],
          }))
        );

        // Get entity and relation classes
        setEntityOntology([
          ...new Set(results.data.flatMap((r) => [r[1], r[4]])),
        ]);
        setRelationOntology([...new Set(results.data.flatMap((r) => r[2]))]);

        setLoading(false); // set loading to false after parsing is complete
      },
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
                <IconButton onClick={handlePopulateExampleGraph}>
                  <AutoFixNormalIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Click to clear form">
                <IconButton onClick={handleClear}>
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
        <Divider />
        <Box p={2} display="flex" direction="row">
          <Stack direction="column" spacing={2} p="0.5rem 0.5rem">
            <Tooltip
              title="Enter a distinct name for your graph"
              placement="left"
            >
              <TextField
                label="Graph Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Tooltip>
            <Box
              component="label"
              display="flex"
              sx={{
                height: 140,
                minWidth: 300,
                textAlign: "center",
                border: `1px dashed grey`,
                borderRadius: "4px",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                color: theme.palette.primary.darker,
                bgcolor: fileUploaded && theme.palette.primary.light,
                ":hover": {
                  bgcolor: theme.palette.primary.light,
                  border: `1px dashed ${theme.palette.primary.main}`,
                  color: theme.palette.primary.darker,
                },
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Stack direction="column" alignItems="center" spacing={1}>
                {loading ? (
                  "Loading..."
                ) : fileName ? (
                  <Box>
                    <TaskAltIcon
                      fontSize="large"
                      sx={{ color: theme.palette.primary.darker }}
                    />
                    <Typography
                      fontWeight={600}
                      color={theme.palette.primary.darker}
                    >
                      Uploaded: {fileName}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <PostAddIcon fontSize="large" />
                    <Typography fontWeight={600}>
                      Select a CSV to upload
                    </Typography>
                    <Typography
                      variant="caption"
                      color={theme.palette.primary.dark}
                    >
                      Each row should be in the format:{" "}
                      <code>
                        head, head type, relation type, tail, tail type
                      </code>
                    </Typography>
                  </>
                )}
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleCSVChange}
                />
              </Stack>
            </Box>
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
                  value={errorModel}
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
                  disabled
                  value={completionModel}
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
            {rows.length > 0 && (
              <>
                <Box>
                  <Typography fontWeight={700}>Entity Classes</Typography>
                  <Typography variant="caption">
                    {entityOntology
                      ? formatList(entityOntology, MAX_ONTOLOGY_ITEM_COUNT)
                      : "Nothing uploaded"}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight={700}>Relation Classes</Typography>
                  <Typography variant="caption">
                    {relationOntology
                      ? formatList(relationOntology, MAX_ONTOLOGY_ITEM_COUNT)
                      : "Nothing uploaded"}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
          <Box sx={{ width: "100%" }} p="0.5rem 0.5rem">
            <DataGrid
              rows={rows}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                  },
                },
                columns: {
                  columnVisibilityModel: {
                    id: false,
                  },
                },
              }}
              pageSizeOptions={[5]}
              // checkboxSelection
              disableRowSelectionOnClick
              slots={{
                noRowsOverlay: CustomNoRowsOverlay,
              }}
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
              to="/"
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
