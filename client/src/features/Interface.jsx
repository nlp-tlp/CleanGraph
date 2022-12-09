import "../App.css";
import { useState, useContext, useEffect } from "react";
import {
  CssBaseline,
  Box,
  TablePagination,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import Graph from "./Graph";
import Panel from "./Panel";
import { GraphContext } from "../shared/context";
import { DRAWER_WIDTH } from "../shared/constants";
import { useParams } from "react-router-dom";
import axios from "axios";

function Interface() {
  const { graphId } = useParams();
  const [state, dispatch] = useContext(GraphContext);

  useEffect(() => {
    const fetchGraphData = async () => {
      await axios.get(`/sample/${graphId}`).then((res) => {
        dispatch({ type: "SET_GRAPH", payload: res.data });
        dispatch({
          type: "SET_LOADING",
          payload: false,
        });
      });
    };

    const fetchGraph = async () => {
      await axios.get(`/graphs/${graphId}`).then((res) => {
        dispatch({
          type: "SET_VALUE",
          payload: { key: "ontology", value: res.data.ontology },
        });
        dispatch({
          type: "SET_VALUE",
          payload: {
            key: "ontologyName2Id",
            value: Object.assign(
              {},
              ...res.data.ontology.map((i) => ({ [i.name]: i.id }))
            ),
          },
        });
        dispatch({
          type: "SET_VALUE",
          payload: { key: "subgraphs", value: res.data.nodes },
        });
        dispatch({
          type: "SET_VALUE",
          payload: {
            key: "graph",
            value: { name: res.data.name, createdAt: res.data.created_at },
          },
        });
      });
    };

    fetchGraphData();
    fetchGraph();
  }, [graphId]);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: "background.default" }}>
        {state.loading ? (
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
                Loading Graph
              </Typography>
              <CircularProgress />
            </Box>
          </Box>
        ) : (
          <>
            <Graph />
            <Panel />
            <GraphPagination />
          </>
        )}
      </Box>
    </Box>
  );
}

const GraphPagination = () => {
  const [state, dispatch] = useContext(GraphContext);
  const { graphId } = useParams();

  const [page, setPage] = useState(0);
  const [triplesPerPage, setTriplesPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);

    console.log("page changing...");

    axios
      .get(`/graphs/${graphId}/${state.currentNode.id}`, {
        params: { skip: newPage, limit: triplesPerPage },
      })
      .then((res) => {
        dispatch({
          type: "SET_VALUE",
          payload: { key: "data", value: res.data },
        });
      });
  };

  const handleChangeTriplesPerPage = (event) => {
    const newTriplesPerPage = parseInt(event.target.value, 10);
    setTriplesPerPage(newTriplesPerPage);
    setPage(0);

    axios
      .get(`/graphs/${graphId}/${state.currentNode.id}`, {
        params: { skip: 0, limit: newTriplesPerPage },
      })
      .then((res) => {
        dispatch({
          type: "SET_VALUE",
          payload: { key: "data", value: res.data },
        });
      });
  };
  return (
    <Box
      sx={{
        position: "absolute",
        width: `calc(100vw - ${DRAWER_WIDTH}px - 2px)`,
        backgroundColor: "rgba(255,255,255,0.95)",
        display: "flex",
        justifyContent: "center",
        bottom: 0,
      }}
    >
      <TablePagination
        component="div"
        count={state.maxTriples}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={triplesPerPage}
        onRowsPerPageChange={handleChangeTriplesPerPage}
        labelRowsPerPage={"Triples per subgraph"}
      />
    </Box>
  );
};

export default Interface;
