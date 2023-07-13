import "../App.css";
import { useContext, useEffect, useState } from "react";
import {
  CssBaseline,
  Box,
  Paper,
  Typography,
  CircularProgress,
  AppBar,
  Toolbar,
  Stack,
  alpha,
} from "@mui/material";
import Graph from "./Graph";
import { GraphContext } from "../shared/context";
import { useParams } from "react-router-dom";
import axios from "axios";
import PrimarySidebar from "./PrimarySidebar/PrimarySidebar";
import Pagination from "./Pagination";
import HelperTray from "./HelperTray";
import ReviewButton from "./ReviewButton";
import Properties from "./PrimarySidebar/Properties";
import { grey } from "@mui/material/colors";
import DialogModal from "./DialogModal";

const Interface = () => {
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
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <DialogModal />
        <Box
          component="main"
          sx={{ flexGrow: 1, bgcolor: "background.default" }}
        >
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
              >
                <CircularProgress />
                <Typography variant="h6" gutterBottom>
                  Loading Graph
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box display="flex">
              <CssBaseline />
              <AppBar
                position="fixed"
                sx={{
                  zIndex: 10001,
                  borderBottom: "1px solid lightgrey",
                  bgcolor: "white",
                  color: "black",
                }}
                elevation={0}
              >
                <Toolbar>
                  <Box
                    display="flex"
                    flexGrow={1}
                    flexDirection="row"
                    justifyContent="space-between"
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="left"
                      spacing={1}
                    >
                      <Typography fontWeight={700}>CleanGraph</Typography>
                      <Typography>{state.graph.name}</Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      justifyContent="right"
                      alignItems="center"
                      spacing={2}
                    >
                      <Pagination />
                      <HelperTray />
                    </Stack>
                  </Box>
                </Toolbar>
              </AppBar>
              <Box component="main" display="flex" sx={{ flexGrow: 1 }}>
                <PrimarySidebar />
                <Graph />
              </Box>
              {state.currentNode && (
                <Box
                  sx={{
                    position: "absolute",
                    right: "1rem",
                    top: "calc(50% - 250px)",
                    width: 300,
                    height: 500,
                    borderColor: grey[300],
                    bgcolor: alpha(grey[100], 0.5),
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderRadius: 4,
                    ":hover": {
                      bgcolor: grey[100],
                    },
                  }}
                >
                  <Properties />
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

export default Interface;
