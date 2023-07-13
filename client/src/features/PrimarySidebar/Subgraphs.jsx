import React, { useContext, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Checkbox,
  ListItemText,
  Tooltip,
  Divider,
  ListItemIcon,
} from "@mui/material";
import { grey, blue, orange } from "@mui/material/colors";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import SortIcon from "@mui/icons-material/Sort";
import MergeIcon from "@mui/icons-material/Merge";
import { useParams } from "react-router-dom";
import { GraphContext } from "../../shared/context";
import axios from "axios";
import { ICON_COLOR } from "../../shared/constants";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const Subgraphs = () => {
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
    <Box p={2}>
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
        {state.subgraphs.length > 0 && (
          <>
            <Box p={2}>
              <Typography sx={{ fontWeight: 700 }}>
                Subgraphs ({state.subgraphs.length})
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
                  onClick={() =>
                    dispatch({
                      type: "SORT_SUBGRAPHS",
                      payload: {
                        sortType: "alpha",
                        sortDescending: !state.sortDescending,
                      },
                    })
                  }
                  sx={{ color: ICON_COLOR }}
                >
                  <SortByAlphaIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sort by degree" placement="top">
                <IconButton
                  onClick={() =>
                    dispatch({
                      type: "SORT_SUBGRAPHS",
                      payload: {
                        sortType: "degree",
                        sortDescending: !state.sortDescending,
                      },
                    })
                  }
                  sx={{ color: ICON_COLOR }}
                >
                  <SortIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sort by errors" placement="top">
                <IconButton
                  // onClick={() =>
                  //   dispatch({
                  //     type: "SORT_SUBGRAPHS",
                  //     payload: {
                  //       sortType: "alpha",
                  //       sortDescending: !state.sortDescending,
                  //     },
                  //   })
                  // }
                  sx={{ color: ICON_COLOR }}
                  disabled
                >
                  <WarningAmberIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <Divider />

            <List
              dense
              sx={{
                overflowY: "scroll",
                height: "calc(100vh - 550px)",
                minHeight: 200,
              }}
            >
              {state.subgraphs.map((sg) => {
                const labelId = `checkbox-list-secondary-label-${sg.id}`;
                return (
                  <ListItem
                    key={sg.id}
                    // secondaryAction={
                    //   <Checkbox
                    //     edge="end"
                    //     // onChange={() => handleToggle(sg.id)}
                    //     // checked={checked.indexOf(sg.id) !== -1}
                    //     inputProps={{ "aria-labelledby": labelId }}
                    //   />
                    // }
                    disablePadding
                    sx={{
                      background:
                        state.centralNode &&
                        sg.id === state.centralNode.id &&
                        grey[300],
                      color:
                        state.centralNode &&
                        sg.id === state.centralNode.id &&
                        "black",
                    }}
                  >
                    <Box
                      p="0.25rem"
                      alignItems="center"
                      display="flex"
                      width="40px"
                    >
                      <ListItemIcon>
                        <TriangleIcon number={5} />
                      </ListItemIcon>
                    </Box>
                    <ListItemButton onClick={() => handleSubGraphFilter(sg.id)}>
                      <ListItemText
                        id={labelId}
                        title={`Click to toggle the ${sg.name} (id: ${sg.id}) subgraph`}
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
    </Box>
  );
};

function TriangleIcon({ number }) {
  const triangleSize = 30; // you can adjust the size as needed
  const triangleHeight = (Math.sqrt(3) / 2) * triangleSize;

  return (
    <svg
      width={triangleSize}
      height={triangleHeight}
      viewBox={`0 0 ${triangleSize} ${triangleHeight}`}
    >
      <polygon
        points={`${
          triangleSize / 2
        },0 ${triangleSize},${triangleHeight} 0,${triangleHeight}`}
        style={{ fill: orange[300], stroke: orange[700], strokeWidth: "1" }}
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
  );
}

export default Subgraphs;
