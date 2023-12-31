import { useContext, useEffect, useState } from "react";
import {
  CssBaseline,
  Box,
  Typography,
  CircularProgress,
  AppBar,
  Toolbar,
  Stack,
  Skeleton,
} from "@mui/material";
import Graph from "../Graph";
import { GraphContext } from "../../shared/context";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PrimarySidebar from "../PrimarySidebar/PrimarySidebar";
import Pagination from "./Pagination";
import HelperTray from "./HelperTray";
import ReviewButton from "./ReviewButton";
import SecondarySidebar from "../SecondarySidebar";
import DialogModal from "../DialogModal";
import { getGraphData, getSubgraph } from "../../shared/api";
import { SnackbarContext } from "../../shared/snackbarContext";
import { DRAWER_WIDTH, ZIndexes } from "../../shared/constants";

const Interface = () => {
  const { graphId } = useParams();
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  let [searchParams, setSearchParams] = useSearchParams();
  let centralNodeId = searchParams.get("centralNodeId");

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await getGraphData(graphId);

        if (res.status === 200) {
          dispatch({ type: "SET_GRAPH", payload: res.data });
          setLoaded(true);
        } else {
          throw new Error();
        }
      } catch (err) {
        openSnackbar("error", "Error", "Error fetching graph");
        navigate("/home");
      }
    };
    fetchGraph();
  }, [graphId]);

  useEffect(() => {
    const fetchGraphData = async () => {
      console.log('"fetchGraphData"', "limit", state.settings.graph.limit);
      try {
        // if centralNodeId is the string "null", set it to null
        if (centralNodeId === "null") {
          centralNodeId = null;
        }

        let params = {
          graphId: graphId,
          skip: 0,
          limit: state.settings.graph.limit,
        };

        if (centralNodeId) {
          params.nodeId = centralNodeId;
        }

        const response = await getSubgraph(params);
        if (response.status === 200) {
          dispatch({ type: "SET_SUBGRAPH", payload: response.data });
        }
      } catch (err) {
        openSnackbar("error", "Error", "Error fetching graph data");
        navigate("/home");
      }
    };

    if (loaded) {
      fetchGraphData();
    }
  }, [loaded]);

  useEffect(() => {
    // console.log(
    //   "limit or page changed",
    //   state.settings.graph.limit,
    //   state.page
    // );
    setLoaded(false);
  }, [state.settings.graph.limit, state.page]);

  useEffect(() => {
    setSearchParams((prevState) => ({
      ...prevState,
      centralNodeId: state.centralNodeId,
      page: state.page,
    }));
  }, [state.centralNodeId, state.page]);

  return (
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <DialogModal />
        <Box
          component="main"
          sx={{ flexGrow: 1, bgcolor: "background.default" }}
        >
          <Box display="flex">
            <CssBaseline />
            <AppBar
              position="fixed"
              sx={{
                zIndex: ZIndexes.level2,
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
                    {state.loading ? (
                      <Skeleton variant="rectangular" width={200} />
                    ) : (
                      <>
                        <Typography fontWeight={700}>CleanGraph</Typography>
                        <Typography>{state.graph.name}</Typography>
                      </>
                    )}
                  </Stack>
                  <Stack
                    direction="row"
                    justifyContent="right"
                    alignItems="center"
                    spacing={2}
                  >
                    {state.loading ? (
                      <Skeleton variant="rectangular" width={300} />
                    ) : (
                      <>
                        <Pagination />
                        <HelperTray />
                      </>
                    )}
                  </Stack>
                </Box>
              </Toolbar>
            </AppBar>
            <Box component="main" display="flex" sx={{ flexGrow: 1 }}>
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
                  <Stack direction="row" alignItems="center" spacing={4}>
                    <CircularProgress />
                    <Typography variant="h6">Loading Graph</Typography>
                  </Stack>
                </Box>
              ) : (
                <>
                  <PrimarySidebar />
                  <Graph />
                  {state.currentItemId && <SecondarySidebar />}
                  <Box
                    sx={{
                      position: "absolute",
                      left: DRAWER_WIDTH + 20,
                      top: 80,
                    }}
                  >
                    <ReviewButton />
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Interface;
