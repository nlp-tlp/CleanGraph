import React, { useContext, useState } from "react";
import Overview from "./Overview";
import Subgraphs from "./Subgraphs";
import { Chip, Drawer, Toolbar, Tooltip, Typography } from "@mui/material";
import { DRAWER_WIDTH, ZIndexes } from "../../shared/constants";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MuiAccordion from "@mui/material/Accordion";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { styled } from "@mui/material/styles";
import { GraphContext } from "../../shared/context";
import { Stack } from "@mui/system";

const Accordion = styled((props) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderLeft: "0px solid",
  borderRight: "0px solid",
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&:before": {
    display: "none",
  },
}));

const AccordionSummary = styled((props) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, .05)"
      : "rgba(0, 0, 0, .01)",
  flexDirection: "row-reverse",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
  },
  "& .MuiAccordionSummary-content": {
    marginLeft: theme.spacing(1),
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
}));

export const CustomAccordion = ({
  children,
  expanded,
  onChange,
  label,
  title,
  value,
  disabled = false,
}) => (
  <Accordion
    sx={{ borderBottom: "1px solid lightgrey" }}
    elevation={0}
    expanded={expanded}
    onChange={onChange}
    disabled={disabled}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      aria-controls="panel1a-content"
      id="panel1a-header"
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
      >
        <Tooltip title={title} placement="right">
          <Typography fontWeight={600} fontSize={14}>
            {label}
          </Typography>
        </Tooltip>
        {value !== undefined && <Chip label={value} size="small" />}
      </Stack>
    </AccordionSummary>
    <AccordionDetails>{children}</AccordionDetails>
  </Accordion>
);

const PrimarySidebar = () => {
  const [state] = useContext(GraphContext);
  const [panelsExpanded, setPanelsExpanded] = useState([
    "overview",
    "subgraphs",
  ]);

  const handleChange = (panel) => (event, newExpanded) => {
    if (panelsExpanded.includes(panel)) {
      setPanelsExpanded((prevState) => prevState.filter((p) => p !== panel));
    } else {
      setPanelsExpanded((prevState) => [...prevState, panel]);
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
        zIndex: ZIndexes.level1,
      }}
    >
      <Toolbar />
      <CustomAccordion
        expanded={panelsExpanded.includes("overview")}
        onChange={handleChange("overview")}
        label="OVERVIEW"
        title="Sneakpeek coming soon!"
      >
        <Overview />
      </CustomAccordion>
      <CustomAccordion
        expanded={panelsExpanded.includes("subgraphs")}
        onChange={handleChange("subgraphs")}
        label="SUBGRAPHS"
        value={state.subgraphs.length}
      >
        <Subgraphs overviewOpen={panelsExpanded.includes("overview")} />
      </CustomAccordion>
    </Drawer>
  );
};

export default PrimarySidebar;
