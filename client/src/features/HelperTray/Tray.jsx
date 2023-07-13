import React, { useContext } from "react";
import { Stack, IconButton, Tooltip } from "@mui/material";
import { Link } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import HelpIcon from "@mui/icons-material/Help";
import SettingsIcon from "@mui/icons-material/Settings";
import CategoryIcon from "@mui/icons-material/Category";
import { GraphContext } from "../../shared/context";
import { ICON_COLOR } from "../../shared/constants";

const HelperTray = () => {
  const [state, dispatch] = useContext(GraphContext);
  const handleIconClick = (viewOption) => {
    dispatch({ type: "TOGGLE_MODAL", payload: { view: viewOption } });
  };

  const icons = [
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
      {/* <Tooltip title="Click to return to home"> */}
      <IconButton size="large" color="primary" component={Link} to="/">
        <HomeIcon fontSize="small" sx={{ color: ICON_COLOR }} />
      </IconButton>
      {/* </Tooltip> */}
    </Stack>
  );
};

export default HelperTray;
