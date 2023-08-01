import React, { useContext, useState } from "react";
import { Tooltip, ToggleButton, ToggleButtonGroup } from "@mui/material";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import SortIcon from "@mui/icons-material/Sort";
import { GraphContext } from "../../shared/context";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PercentIcon from "@mui/icons-material/Percent";
import { sortSubgraphs, putIdOnTop } from "../../shared/utils";
import { Box } from "@mui/system";

const SubgraphSort = ({
  setFilteredData,
  sortDescending,
  setSortDescending,
}) => {
  const [state] = useContext(GraphContext);
  const [sortType, setSortType] = useState();
  const handleSort = (event, newSorting) => {
    if (newSorting !== null) {
      const { field, direction } = newSorting;

      setFilteredData((prevState) =>
        sortSubgraphs(prevState, field, direction)
      );
      setSortDescending(direction);
      setSortType(newSorting);
    }
  };

  return (
    <Box display="flex" mb={2} justifyContent="center">
      <ToggleButtonGroup
        value={sortType}
        exclusive
        onChange={handleSort}
        size="small"
      >
        <ToggleButton value={{ field: "alpha", direction: !sortDescending }}>
          <Tooltip title="Sort alphabetically" placement="top">
            <SortByAlphaIcon />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value={{ field: "degree", direction: !sortDescending }}>
          <Tooltip title="Sort by the central nodes degree" placement="top">
            <SortIcon />
          </Tooltip>
        </ToggleButton>
        {state.settings.display_errors && (
          <ToggleButton
            value={{ field: "errors", direction: !sortDescending }}
            disabled={!state.settings.display_errors}
          >
            <Tooltip title="Sort by the number of errors" placement="top">
              <WarningAmberIcon sx={{ color: state.settings.colors.error }} />
            </Tooltip>
          </ToggleButton>
        )}

        {state.settings.display_suggestions && (
          <ToggleButton
            value={{ field: "suggestions", direction: !sortDescending }}
            disabled={!state.settings.display_suggestions}
          >
            <Tooltip title="Sort by the number of suggestions" placement="top">
              <LightbulbIcon sx={{ color: state.settings.colors.suggestion }} />
            </Tooltip>
          </ToggleButton>
        )}
        <ToggleButton
          value={{ field: "reviewed_progress", direction: !sortDescending }}
        >
          <Tooltip title="Sort by reviewed progress" placement="top">
            <PercentIcon sx={{ color: state.settings.colors.reviewed }} />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default SubgraphSort;
