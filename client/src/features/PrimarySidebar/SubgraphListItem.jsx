import {
  Box,
  Chip,
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { green, grey, red } from "@mui/material/colors";
import React, { useContext } from "react";
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
  const displaySecondaryText =
    settings.display_errors || settings.display_suggestions;
  const secondaryText =
    settings.display_errors && settings.display_suggestions
      ? `errors: ${item.errors} | suggestions: ${item.suggestions}`
      : settings.display_errors
      ? `errors: ${item.errors}`
      : `suggestions: ${item.suggestions}`;

  return (
    <ListItem
      style={style}
      key={item._id}
      disablePadding
      sx={{
        background: item._id === centralNodeId && grey[300],
        color: item._id === centralNodeId && "black",
      }}
    >
      {loadingSubgraph ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="100%"
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography fontSize={14}>Loading subgraph</Typography>
            <CircularProgress size={22} />
          </Stack>
        </Box>
      ) : (
        <ListItemButton onClick={() => handleSubGraphFilter(item._id)}>
          <ListItemText
            id={`subgraph-${item._id}`}
            title={`Click to toggle the (${item.name})[${
              state.ontologyId2Detail.nodes[item.type].name
            }] subgraph of size ${item.value}`}
            primary={`${item.name} (${item.value})`}
            secondary={
              displaySecondaryText && (
                <Typography variant="caption">{secondaryText}</Typography>
              )
            }
          />
          <Box>
            <GradientChip progress={item.reviewed_progress} />
          </Box>
        </ListItemButton>
      )}
    </ListItem>
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
