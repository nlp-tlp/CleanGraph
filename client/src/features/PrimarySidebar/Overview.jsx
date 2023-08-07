import React, { useContext } from "react";
import {
  Typography,
  Stack,
  Alert,
  AlertTitle,
  useTheme,
  Button,
  alpha,
  darken,
} from "@mui/material";
import { GraphContext } from "../../shared/context";
import TimelineIcon from "@mui/icons-material/Timeline";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const Overview = () => {
  const [state] = useContext(GraphContext);
  const theme = useTheme();

  // TODO: update this - current size needs to take into account the entire graph not just
  // the current subgraph...
  const startSize = state.startEdgeCount || 0;
  const currentSize =
    Object.values(state.data?.links).filter((l) => l.is_active).length || 0;
  const diffSize = startSize - currentSize;
  const errorSize = state?.totalErrors || 0;
  const suggestionSize = state?.totalSuggestions || 0;

  const reviewedNodesSize = state.reviewedNodes;
  const reviewedEdgesSize = state.reviewedEdges;
  const reviewedSize = reviewedNodesSize + reviewedEdgesSize;

  const alerts = [
    {
      name: "review",
      title: "Reviewed",
      color: state.settings.colors.reviewed,
      icon: <CheckBoxIcon />,
      count: `N:${reviewedNodesSize}/${state.startNodeCount} E:${reviewedEdgesSize}/${state.startEdgeCount}`,
      showButton: reviewedSize > 0,
    },
    {
      name: "errors",
      title: "Errors",
      color: state.settings.colors.error,
      icon: <WarningAmberIcon />,
      count: errorSize,
      showButton: errorSize > 0,
      hide: !state.settings.display_errors,
    },
    {
      name: "suggestions",
      title: "Suggestions",
      color: state.settings.colors.suggestion,
      icon: <TipsAndUpdatesIcon />,
      count: suggestionSize,
      showButton: suggestionSize > 0,
      hide: !state.settings.display_suggestions,
    },
  ];

  return (
    <Stack p={2} spacing={2}>
      <Alert
        sx={{
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primary.dark,
        }}
        icon={<TimelineIcon sx={{ color: theme.palette.primary.darker }} />}
      >
        <AlertTitle sx={{ fontSize: 14 }}>Triples</AlertTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography fontSize={16} fontWeight={700}>
            {currentSize}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            {diffSize > 0 ? <ArrowDropDownIcon /> : <ArrowDropUpIcon />}
            <Typography fontSize={14}>
              {diffSize > 0 ? "-" : "+"} {Math.abs(diffSize)} triples
            </Typography>
          </Stack>
        </Stack>
      </Alert>
      {alerts
        .filter((alert) => !alert.hide)
        .map((alert, index) => (
          <ColoredAlert key={index} {...alert} />
        ))}
    </Stack>
  );
};

const ColoredAlert = ({
  name,
  color,
  icon,
  title,
  count,
  showButton = true,
}) => {
  const [state, dispatch] = useContext(GraphContext);

  const handleShow = (viewOption) => {
    dispatch({ type: "TOGGLE_MODAL", payload: { view: viewOption } });
  };

  return (
    <Alert
      icon={React.cloneElement(icon, {
        sx: { color: darken(color, 0.5) },
      })}
      sx={{
        backgroundColor: alpha(color, 0.25),
        color: darken(color, 0.5),
      }}
      action={
        showButton && (
          <Button
            color="inherit"
            size="small"
            sx={{ fontSize: 10 }}
            onClick={() => handleShow(name)}
          >
            Show
          </Button>
        )
      }
    >
      <AlertTitle sx={{ fontSize: 14 }}>{title}</AlertTitle>
      <Typography fontSize={16} fontWeight={600}>
        {count}
      </Typography>
    </Alert>
  );
};

export default Overview;
