import React, { useContext } from "react";
import {
  Typography,
  Stack,
  Alert,
  AlertTitle,
  useTheme,
  Button,
} from "@mui/material";
import { GraphContext } from "../../shared/context";
import TimelineIcon from "@mui/icons-material/Timeline";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const Overview = () => {
  const [state] = useContext(GraphContext);
  const theme = useTheme();

  const startSize = state.data?.links.length || 0;
  const currentSize = state.data?.links.filter((l) => l.active).length || 0;
  const diffSize = startSize - currentSize;
  const reviewedSize = state.reviewed?.links.length || 0;
  const errorSize = state.errors?.length || 10;

  return (
    <Stack p={2} spacing={2}>
      <Alert
        sx={{
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primary.dark,
        }}
        icon={<TimelineIcon sx={{ color: theme.palette.primary.darker }} />}
      >
        <AlertTitle>Triples</AlertTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">{currentSize}</Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            {diffSize > 0 ? <ArrowDropDownIcon /> : <ArrowDropUpIcon />}
            <Typography variant="body2">
              {diffSize > 0 ? "-" : "+"} {Math.abs(diffSize)} triples
            </Typography>
          </Stack>
        </Stack>
      </Alert>
      <Alert
        sx={{
          backgroundColor:
            reviewedSize > 0 ? "success" : theme.palette.primary.light,
          color: reviewedSize > 0 ? "success" : theme.palette.primary.dark,
        }}
        icon={
          <CheckBoxIcon
            sx={{
              color:
                reviewedSize > 0 ? "success" : theme.palette.primary.darker,
            }}
          />
        }
      >
        <AlertTitle>Reviewed</AlertTitle>
        <Typography variant="h6">{reviewedSize}</Typography>
      </Alert>
      <Alert
        severity={errorSize > 0 ? "warning" : "success"}
        action={
          errorSize > 0 && (
            <Button color="inherit" size="small">
              Show
            </Button>
          )
        }
      >
        <AlertTitle>Errors Detected</AlertTitle>
        <Typography variant="h6">{errorSize}</Typography>
      </Alert>
    </Stack>
  );
};

export default Overview;
