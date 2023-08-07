import React, { useContext } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { green, red } from "@mui/material/colors";
import { styled } from "@mui/material/styles";
import chroma from "chroma-js";
import { GraphContext } from "../../shared/context";

const SubgraphListItem = ({
  style,
  item,
  settings,
  centralNodeId,
  handleSubGraphFilter,
  loadingSubgraph = false,
}) => {
  const [state] = useContext(GraphContext);
  const itemActive = item._id === centralNodeId;
  const displaySecondaryText =
    settings.display_errors || settings.display_suggestions;
  const secondaryText =
    settings.display_errors && settings.display_suggestions
      ? `errors: ${item.errors} | suggestions: ${item.suggestions}`
      : settings.display_errors
      ? `errors: ${item.errors}`
      : `suggestions: ${item.suggestions}`;

  return (
    <Box
      style={style}
      display="flex"
      alignItems="center"
      justifyContent="flex-start"
      sx={{
        border: itemActive && "1px solid rgba(0,0,0,0.125)",
        borderRadius: 2,
        "&:hover": {
          backgroundColor: "rgba(0,0,0,0.03)",
          cursor: "pointer",
        },
      }}
      p={1}
      width="100%"
      height={70}
      onClick={() => handleSubGraphFilter(item._id)}
      mb={1}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          border: "1px solid rgba(0,0,0,0.125)",
          borderRadius: 1,
          width: 40,
          height: 40,
          backgroundColor: itemActive && "rgba(0,0,0,0.8)",
          color: itemActive && "white",
        }}
      >
        {item.value}
      </Box>
      <Box
        ml={1}
        p={1}
        key={`subgraph-${item._id}`}
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        width="100%"
      >
        {loadingSubgraph ? (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography fontSize={14}>Loading subgraph</Typography>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            width="100%"
          >
            <Tooltip
              title={`Click to toggle the (${item.name}) [${
                state.ontologyId2Detail.nodes[item.type].name
              }] subgraph of size ${item.value}`}
              placement="right"
            >
              <Box>
                <Typography
                  fontSize={14}
                  fontWeight={600}
                  color="rgba(0,0,0,0.8)"
                >
                  {item.name}
                </Typography>
                {displaySecondaryText && (
                  <Typography fontSize={12} color="rgba(0,0,0,0.5)">
                    {secondaryText}
                  </Typography>
                )}
              </Box>
            </Tooltip>
            <GradientChip
              progress={Math.round(
                ((item.edges_reviewed + item.nodes_reviewed) /
                  (item.edge_count + item.node_count)) *
                  100
              )}
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
};

// Define color scale
const colorScale = chroma.scale([red[500], green[500]]).mode("lch");

// Styled component for the chip
const StyledChip = styled(Chip)(({ theme, progress }) => ({
  // Set the background to a gradient from left to right
  backgroundColor: theme.palette.grey[300],
  backgroundImage: `linear-gradient(90deg, ${colorScale(
    progress / 100
  ).hex()} ${progress}%, white ${progress}%)`,
  cursor: "help",
}));

const GradientChip = ({ progress }) => {
  return (
    <Tooltip title={`You have reviewed ${progress}% of this subgraph`}>
      <StyledChip
        label={`${progress}%`}
        progress={progress}
        size="small"
        variant="outlined"
      />
    </Tooltip>
  );
};

export default SubgraphListItem;
