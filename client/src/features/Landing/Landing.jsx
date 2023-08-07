import {
  Box,
  Button,
  Container,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  Stack,
} from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { DocsURL } from "../../shared/misc";
import GitHubIcon from "@mui/icons-material/GitHub";
import ArticleIcon from "@mui/icons-material/Article";
import logo from "./logo.svg";

const Landing = () => {
  const theme = useTheme();
  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <Box sx={{ position: "absolute", top: 0, right: 0 }} m={1}>
        <Tooltip title="Navigate to the CleanGraph Documentation">
          <IconButton
            component="a"
            href={DocsURL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              ":hover": {
                color: theme.palette.primary.darker,
              },
            }}
          >
            <ArticleIcon fontSize="large" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Navigate to the CleanGraph GitHub Repository">
          <IconButton
            component="a"
            href="https://github.com/nlp-tlp/CleanGraph"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              ":hover": {
                color: theme.palette.primary.darker,
              },
            }}
          >
            <GitHubIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>
      <Stack direction="column" spacing={4} alignItems="center">
        <Stack direction="row" alignItems="center" spacing={2}>
          <img src={logo} alt="Logo" height={60} />
          <Typography variant="h2" component="div" gutterBottom align="center">
            CleanGraph
          </Typography>
        </Stack>
        <Typography variant="h6" component="div" gutterBottom align="center">
          Interactive Knowledge Graph Refinement and Completion
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            to="/home"
            component={Link}
          >
            Get Started
          </Button>
        </Box>
      </Stack>
    </Container>
  );
};

export default Landing;
