import React from "react";
import { Box } from "@mui/material";
import HelperTray from "./HelperTray";
import Pagination from "./Pagination";
import ReviewButton from "./ReviewButton";
import { DRAWER_WIDTH, SECONDARY_DRAWER_WIDTH } from "../shared/constants";

const Footer = ({ showSecondarySidebar, setShowSecondarySidebar }) => {
  return (
    <Box
      sx={{
        backgroundColor: "rgba(255,255,255,0.95)",
        bottom: 0,
        position: "absolute",
        width: `calc(100vw - ${DRAWER_WIDTH}px - ${
          showSecondarySidebar ? SECONDARY_DRAWER_WIDTH : 0
        }px - 1px)`,
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        m="0rem 0.5rem"
        p="0.5rem"
        alignItems="center"
      >
        <HelperTray
          showSecondarySidebar={showSecondarySidebar}
          setShowSecondarySidebar={setShowSecondarySidebar}
        />
        <Pagination />
        <ReviewButton />
      </Box>
    </Box>
  );
};

export default Footer;
