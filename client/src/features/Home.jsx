import "../App.css";
import { useContext } from "react";
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
} from "@mui/material";
import HubIcon from "@mui/icons-material/Hub";
import DeleteIcon from "@mui/icons-material/Delete";
import { GraphContext } from "../shared/context";
import { Link } from "react-router-dom";
import axios from "axios";

function Home() {
  const [state, dispatch] = useContext(GraphContext);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: "background.default" }}>
        {state.graphsLoading ? (
          <Box
            sx={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component={Paper}
              sx={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                maxWidth: 300,
                textAlign: "center",
              }}
              p={4}
              elevation={3}
            >
              <Typography variant="h6" gutterBottom>
                Loading Graph Refinement Application
              </Typography>
              <CircularProgress />
            </Box>
          </Box>
        ) : (
          <GraphSelection />
        )}
      </Box>
    </Box>
  );
}

const GraphSelection = () => {
  const [state, dispatch] = useContext(GraphContext);

  const handleDelete = async (graphId) => {
    console.log("delete graph", graphId);

    await axios.delete(`/graphs/${graphId}`).then((res) => {
      if (res.status === 200) {
        dispatch({ type: "DELETE_GRAPH", payload: { graphId } });
      }
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
        p={2}
      >
        <Box mb={2} sx={{ maxHeight: 600, overflowY: "auto" }}>
          {state.graphs.length === 0 ? (
            <Typography variant="h6" gutterBottom>
              No graphs created
            </Typography>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Graphs
              </Typography>
              <List
                sx={{ width: "100%" }} //maxWidth: 360
                component="nav"
              >
                {state.graphs.map((g) => (
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="graph-delete"
                        title="Click to delete graph"
                        onClick={() => handleDelete(g.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
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
        <Button component={Link} to="/create" variant="contained" mb={2}>
          Create new graph
        </Button>
      </Box>
    </Box>
  );
};

export default Home;
