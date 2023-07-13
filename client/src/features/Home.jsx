import "../App.css";
import { useContext, useEffect, useState } from "react";
import {
  CssBaseline,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Typography,
  CircularProgress,
  IconButton,
  Divider,
  Stack,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import HubIcon from "@mui/icons-material/Hub";
import DeleteIcon from "@mui/icons-material/Delete";
import { GraphContext } from "../shared/context";
import { Link } from "react-router-dom";
import axios from "axios";
import GitHubIcon from "@mui/icons-material/GitHub";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { purple } from "@mui/material/colors";
import ArticleIcon from "@mui/icons-material/Article";

const Home = () => {
  const [state, dispatch] = useContext(GraphContext);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const fetchGraphs = async () => {
      if (loading) {
        await axios.get("/graphs/").then((res) => {
          dispatch({
            type: "SET_VALUE",
            payload: { key: "graphs", value: res.data },
          });
          setLoading(false);
        });
        setLoading(false);
      }
    };
    fetchGraphs();
  }, [loading]);

  return (
    <Box display="flex">
      <Box sx={{ position: "absolute", top: 0, right: 0 }} m={1}>
        <Tooltip title="Navigate to the CleanGraph Documentation">
          <IconButton
            component="a"
            // href=""
            // target="_blank"
            // rel="noopener noreferrer"
            sx={{
              ":hover": {
                color: theme.palette.primary.darker,
              },
            }}
          >
            <ArticleIcon fontSize="large" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Navigate to the CleanGraph GitHub Repository">
          <IconButton
            component="a"
            href="https://github.com/4theKnowledge/CleanGraph"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              ":hover": {
                color: theme.palette.primary.darker,
              },
            }}
          >
            <GitHubIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>
      <CssBaseline />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
        }}
      >
        <GraphSelection loading={loading} />
      </Box>
    </Box>
  );
};

const GraphSelection = ({ loading }) => {
  const [state, dispatch] = useContext(GraphContext);
  const [deleting, setDeleting] = useState();
  const theme = useTheme();

  const handleDelete = async (graphId) => {
    setDeleting(graphId);
    await axios
      .delete(`/graphs/${graphId}`)
      .then((res) => {
        if (res.status === 200) {
          dispatch({ type: "DELETE_GRAPH", payload: { graphId } });
        }
      })
      .finally(() => {
        setDeleting();
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
          width: 600,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ maxHeight: 600, overflowY: "auto" }}>
          <Box p={2}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h5" gutterBottom>
                Graphs
              </Typography>
              <Tooltip title="Click to create a new graph">
                <IconButton component={Link} to="/create">
                  <AddCircleIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider />
          <Box p={2} alignItems="center" display="flex" justifyContent="center">
            {loading ? (
              <Box p={2}>
                <Stack direction="column" spacing={2} alignItems="center">
                  <CircularProgress size={30} />
                  <Typography variant="h6" gutterBottom>
                    Loading graphs
                  </Typography>
                </Stack>
              </Box>
            ) : state.graphs.length === 0 ? (
              <Box p={2}>
                <Stack direction="row" spacing={1} alignItems="top">
                  <Typography variant="h6" gutterBottom>
                    No graphs exist: Click the
                  </Typography>
                  <span>
                    <AddCircleIcon sx={{ color: theme.palette.primary.main }} />
                  </span>
                  <Typography variant="h6" gutterBottom>
                    to add one
                  </Typography>
                </Stack>
              </Box>
            ) : (
              <>
                <List
                  sx={{ width: "100%" }} //maxWidth: 360
                  component="nav"
                >
                  {state.graphs.map((g, index) => (
                    <ListItem
                      key={index}
                      disablePadding
                      secondaryAction={
                        <>
                          {deleting === g.id ? (
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <CircularProgress size={16} />
                            </Box>
                          ) : (
                            <IconButton
                              edge="end"
                              aria-label="graph-delete"
                              title="Click to delete graph"
                              onClick={() => handleDelete(g.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </>
                      }
                    >
                      <ListItemButton component={Link} to={`/${g.id}`}>
                        <ListItemIcon>
                          <HubIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={g.name}
                          secondary={`Created: ${g.created_at} Last Updated: ${g.last_updated}`} // Size: ${g.size} | Reviewed: ${g.reviewed * 100}% |
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </Box>
        <Divider />
        <Box
          p={2}
          display="flex"
          justifyContent="right"
          height={40}
          sx={{ bgcolor: theme.palette.primary.light }}
        />
      </Box>
    </Box>
  );
};

export default Home;
