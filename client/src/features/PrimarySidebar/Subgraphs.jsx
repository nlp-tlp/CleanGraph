import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import SortIcon from "@mui/icons-material/Sort";
import { useParams } from "react-router-dom";
import { GraphContext } from "../../shared/context";
import { ICON_COLOR } from "../../shared/constants";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PercentIcon from "@mui/icons-material/Percent";
import { getSubgraph } from "../../shared/api";
import { SnackbarContext } from "../../shared/snackbarContext";
import { FixedSizeList } from "react-window";
import SubgraphTextSearch from "./SubgraphTextSearch";
import SubgraphListItem from "./SubgraphListItem";
import { sortSubgraphs, putIdOnTop } from "../../shared/utils";

const Subgraphs = () => {
  const { graphId } = useParams();
  const [state, dispatch] = useContext(GraphContext);
  const { openSnackbar } = useContext(SnackbarContext);
  const [filteredData, setFilteredData] = useState(state.subgraphs);
  const [loadingSubgraphNodeId, setLoadingSubgraphNodeId] = useState();
  const [sortDescending, setSortDescending] = useState(true);

  const handleSubGraphFilter = async (nodeId) => {
    try {
      setLoadingSubgraphNodeId(nodeId);
      const response = await getSubgraph(graphId, nodeId);
      if (response.status === 200) {
        dispatch({
          type: "SET_SUBGRAPH",
          payload: response.data,
        });
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Failed to retrieve subgraph");
    } finally {
      setLoadingSubgraphNodeId(null);
    }
  };

  useEffect(() => {
    setFilteredData(state.subgraphs);
  }, [state.subgraphs]);

  const handleSort = (sortType) => {
    setFilteredData((prevState) =>
      sortSubgraphs(prevState, sortType, !sortDescending)
    );
    setSortDescending(!sortDescending);
  };

  return (
    <Box p="0.25rem 1rem">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          border: `1px solid ${grey[300]}`,
          borderRadius: 2,
          backgroundColor: grey[100],
        }}
      >
        <>
          <Box p={2}>
            <Typography sx={{ fontWeight: 700 }}>
              Subgraphs ({filteredData.length})
            </Typography>
          </Box>
          <Divider />
          <Stack
            direction="row"
            justifyContent="space-evenly"
            alignItems="center"
            p={0.5}
          >
            <Tooltip title="Sort alphabetically" placement="top">
              <IconButton
                onClick={() => handleSort("alpha")}
                size="small"
                sx={{ color: ICON_COLOR }}
              >
                <SortByAlphaIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sort by the central nodes degree" placement="top">
              <IconButton
                onClick={() => handleSort("degree")}
                size="small"
                sx={{ color: ICON_COLOR }}
              >
                <SortIcon />
              </IconButton>
            </Tooltip>
            {state.settings.display_errors && (
              <IconButton
                onClick={() => handleSort("errors")}
                size="small"
                sx={{ color: ICON_COLOR }}
                disabled={!state.settings.display_errors}
              >
                <Tooltip title="Sort by the number of errors" placement="top">
                  <WarningAmberIcon />
                </Tooltip>
              </IconButton>
            )}
            {state.settings.display_suggestions && (
              <IconButton
                onClick={() => handleSort("suggestions")}
                size="small"
                sx={{ color: ICON_COLOR }}
                disabled={!state.settings.display_suggestions}
              >
                <Tooltip
                  title="Sort by the number of suggestions"
                  placement="top"
                >
                  <LightbulbIcon />
                </Tooltip>
              </IconButton>
            )}
            <Tooltip title="Sort by reviewed progress" placement="top">
              <IconButton
                onClick={() => handleSort("reviewed_progress")}
                size="small"
                sx={{ color: ICON_COLOR }}
              >
                <PercentIcon />
              </IconButton>
            </Tooltip>
          </Stack>
          <Divider />
          <Box>
            <SubgraphTextSearch
              data={state.subgraphs}
              setResults={setFilteredData}
            />
          </Box>
          <Divider />
          <FixedSizeList
            height={
              state.settings.display_errors ||
              state.settings.display_suggestions
                ? 360
                : 600
            }
            itemCount={filteredData.length}
            itemSize={
              state.settings.display_errors ||
              state.settings.display_suggestions
                ? 72
                : 48
            }
            width="100%"
          >
            {({ index, style }) => (
              <SubgraphListItem
                style={style}
                item={filteredData[index]}
                settings={state.settings}
                centralNodeId={state.centralNodeId}
                handleSubGraphFilter={handleSubGraphFilter}
                loadingSubgraph={
                  loadingSubgraphNodeId === filteredData[index]._id
                }
              />
            )}
          </FixedSizeList>
        </>
      </Box>
    </Box>
  );
};

export const TriangleIcon = ({ context, number, fillColor, strokeColor }) => {
  const triangleSize = 30; // you can adjust the size as needed
  const triangleHeight = (Math.sqrt(3) / 2) * triangleSize;

  return (
    <Tooltip title={`There are ${number} ${context} on this subgraph`}>
      <svg
        width={triangleSize}
        height={triangleHeight}
        viewBox={`0 0 ${triangleSize} ${triangleHeight}`}
        style={{ cursor: "help", userSelect: "none" }}
      >
        <polygon
          points={`${
            triangleSize / 2
          },0 ${triangleSize},${triangleHeight} 0,${triangleHeight}`}
          style={{ fill: fillColor, stroke: strokeColor, strokeWidth: "1" }}
        />
        <text
          x={triangleSize / 2}
          y={(3 * triangleHeight) / 4}
          textAnchor="middle"
          fontSize={triangleSize / 2.5}
          style={{ fill: "black" }}
        >
          {number}
        </text>
      </svg>
    </Tooltip>
  );
};

export default Subgraphs;
