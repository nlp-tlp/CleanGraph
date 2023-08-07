import React, { useContext, useState } from "react";
import {
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
} from "@mui/material";
import { Link, useParams } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import HelpIcon from "@mui/icons-material/Help";
import SettingsIcon from "@mui/icons-material/Settings";
import CategoryIcon from "@mui/icons-material/Category";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { GraphContext } from "../../../shared/context";
import { ICON_COLOR } from "../../../shared/constants";
import axios from "axios";
import { saveAs } from "file-saver";

const HelperTray = () => {
  const { graphId } = useParams();
  const [state, dispatch] = useContext(GraphContext);
  const [downloading, setDownloading] = useState(false);
  const handleIconClick = (viewOption) => {
    dispatch({ type: "TOGGLE_MODAL", payload: { view: viewOption } });
  };

  const icons = [
    {
      icon: <AddCircleIcon fontSize="small" sx={{ color: ICON_COLOR }} />,
      viewOption: "add",
      title: "Click to add new graph item",
    },
    {
      icon: <CategoryIcon fontSize="small" sx={{ color: ICON_COLOR }} />,
      viewOption: "legend",
      title: "Click to show legend",
    },
    {
      icon: <HelpIcon fontSize="small" sx={{ color: ICON_COLOR }} />,
      viewOption: "help",
      title: "Click to show help information",
    },
    {
      icon: <SettingsIcon fontSize="small" sx={{ color: ICON_COLOR }} />,
      viewOption: "settings",
      title: "Click to access settings",
    },
  ];

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await axios.get(`/graph/download/${graphId}`, {
        responseType: "blob",
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], { type: "application/json" });
        saveAs(blob, `graph_${graphId}.json`);
      } else {
        throw new Error("Unable to download data");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack direction="row" alignItems="center">
      {icons.map(({ icon, viewOption, title }, index) => (
        <Tooltip title={title}>
          <IconButton
            key={index}
            color="primary"
            onClick={() => handleIconClick(viewOption)}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
      <Tooltip title="Click to download graph">
        {downloading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            p="12px"
          >
            <CircularProgress size="1.25rem" />
          </Box>
        ) : (
          <IconButton size="large" color="primary" onClick={handleDownload}>
            <DownloadForOfflineIcon
              fontSize="small"
              sx={{ color: ICON_COLOR }}
            />
          </IconButton>
        )}
      </Tooltip>
      {/* <Tooltip title="Click to return to home"> */}
      <IconButton size="large" color="primary" component={Link} to="/home">
        <HomeIcon fontSize="small" sx={{ color: ICON_COLOR }} />
      </IconButton>
      {/* </Tooltip> */}
    </Stack>
  );
};

export default HelperTray;
