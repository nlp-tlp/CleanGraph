import "./Styles.css";
import { useState, useContext } from "react";
import {
  Box,
  Grid,
  Stack,
  Typography,
  Drawer,
  IconButton,
  Divider,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import SettingsIcon from "@mui/icons-material/Settings";
import { DRAWER_WIDTH } from "../shared/constants";
import { GraphContext } from "../shared/context";
import EditTray from "./EditTray";
import HomeIcon from "@mui/icons-material/Home";
import LegendToggleIcon from "@mui/icons-material/LegendToggle";
import HelpIcon from "@mui/icons-material/Help";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import CloseIcon from "@mui/icons-material/Close";
import { Link } from "react-router-dom";

function Panel() {
  const [state, dispatch] = useContext(GraphContext);
  const [nodeInfo, setNodeInfo] = useState();
  const [showLegend, setShowLegend] = useState(false);

  return (
    <>
      <Box sx={{ position: "absolute", top: 0, left: 0, m: 2 }}>
        <Stack direction="row">
          <IconButton
            size="large"
            color="primary"
            onClick={() => setShowLegend(!showLegend)}
            title="Click to show legend"
          >
            <LegendToggleIcon />
          </IconButton>
          <IconButton
            size="large"
            color="primary"
            title="Click to show help information"
          >
            <HelpIcon />
          </IconButton>
          <IconButton
            size="large"
            color="primary"
            title="Click to access settings"
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            size="large"
            color="primary"
            component={Link}
            to="/"
            title="Click to return to home"
          >
            <HomeIcon />
          </IconButton>
        </Stack>
      </Box>
      <Box sx={{ position: "absolute", top: 0, right: DRAWER_WIDTH, m: 2 }}>
        <IconButton
          onClick={() => console.log("Marking as reviewed...")}
          title="Click to mark as reviewed"
          color="success"
        >
          <ThumbUpAltIcon />
        </IconButton>
      </Box>
      <Drawer
        anchor={"left"}
        open={showLegend}
        onClose={() => setShowLegend(false)}
      >
        <Box sx={{ width: "auto" }}>
          {state.ontology && (
            <Stack direction="column" spacing={0}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                p={2}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, textAlign: "center" }}
                >
                  Legend
                </Typography>
                <IconButton onClick={() => setShowLegend(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Divider />

              <Box p={2}>
                <Typography gutterBottom sx={{ fontWeight: 700 }}>
                  Nodes
                </Typography>
                <div className="my-legend">
                  <div className="legend-scale">
                    <ul className="legend-labels">
                      {state.ontology
                        .filter((i) => i.is_entity)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((n) => (
                          <li>
                            <span
                              style={{
                                background: n.color,
                              }}
                            ></span>
                            {n.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
                <Typography gutterBottom sx={{ fontWeight: 700 }}>
                  Edges
                </Typography>
                <div className="my-legend">
                  <div className="legend-scale">
                    <ul className="legend-labels">
                      {state.ontology
                        .filter((i) => !i.is_entity)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((e) => (
                          <li>
                            <span
                              style={{
                                background: e.color,
                              }}
                            ></span>
                            {e.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </Box>
            </Stack>
          )}
        </Box>
      </Drawer>
      <Drawer
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
        variant="permanent"
        anchor="right"
      >
        <Grid container>
          <Grid
            item
            xs={12}
            sx={{ backgroundColor: grey[50], height: "100vh" }}
          >
            <EditTray />
          </Grid>
        </Grid>
      </Drawer>
    </>
  );
}

export default Panel;
