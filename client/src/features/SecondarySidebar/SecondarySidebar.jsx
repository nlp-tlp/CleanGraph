// Defaults to central node but will switch based on left click action on nodes.

import React, { useContext, useState } from "react";
import { Drawer, Toolbar } from "@mui/material";
import { GraphContext } from "../../shared/context";
import NodeMerge from "../ModalViews/NodeMerge";
import { DRAWER_WIDTH, ZIndexes } from "../../shared/constants";
import { CustomAccordion } from "../PrimarySidebar/PrimarySidebar";
import Details from "./Details";
import ActionTray from "./ActionTray";
import Properties from "./Properties";
import ErrorsAndSuggestions from "./ErrorsAndSuggestions";
import { useUpdateItem } from "../../shared/hooks/useUpdateItem";

const SecondarySidebar = () => {
  const [{ currentItemId, currentItemIsNode, data }, dispatch] =
    useContext(GraphContext);

  const currentItem = currentItemIsNode
    ? data.nodes[currentItemId]
    : data.links[currentItemId];
  const [values, setValues] = useState({
    name: currentItem.name,
    type: currentItem.type,
    properties: currentItem.properties,
  });

  // const [expanded, setExpanded] = useState("details");
  const [panelsExpanded, setPanelsExpanded] = useState(["details"]);

  const handleChange = (panel) => (event, newExpanded) => {
    if (panelsExpanded.includes(panel)) {
      setPanelsExpanded((prevState) => prevState.filter((p) => p !== panel));
    } else {
      setPanelsExpanded((prevState) => [...prevState, panel]);
    }
  };

  const { loading, showMergeModal, setShowMergeModal, handleUpdate } =
    useUpdateItem();

  const errorSize = currentItem?.errors.length || 0;
  const suggestionSize = currentItem?.suggestions.length || 0;
  const notReviewedErrorSize =
    currentItem?.errors.filter((e) => !e.acknowledged).length || 0;
  const notReviewedSuggestionSize =
    currentItem?.suggestions.filter((s) => !s.acknowledged).length || 0;

  return (
    <Drawer
      variant="permanent"
      anchor="right"
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
      {showMergeModal.open && (
        <NodeMerge
          open={showMergeModal.open}
          handleClose={() => setShowMergeModal({ open: false, data: null })}
          data={showMergeModal.data}
        />
      )}

      <ActionTray
        currentItem={currentItem}
        currentItemIsNode={currentItemIsNode}
      />

      <CustomAccordion
        expanded={panelsExpanded.includes("details")}
        onChange={handleChange("details")}
        label="DETAILS"
      >
        <Details handleUpdate={handleUpdate} loading={loading} />
      </CustomAccordion>
      <CustomAccordion
        expanded={panelsExpanded.includes("properties")}
        onChange={handleChange("properties")}
        label="PROPERTIES"
        value={values?.properties && Object.keys(values.properties).length}
      >
        <Properties
          itemId={currentItem._id}
          itemIsNode={currentItemIsNode}
          values={values}
          setValues={setValues}
        />
      </CustomAccordion>

      <CustomAccordion
        expanded={panelsExpanded.includes("errors")}
        onChange={handleChange("errors")}
        label="ERRORS"
        value={`${notReviewedErrorSize} of ${errorSize}`}
        disabled={errorSize === 0}
      >
        <ErrorsAndSuggestions
          isErrors={true}
          currentItemId={currentItemId}
          currentItemIsNode={currentItemIsNode}
          setShowMergeModal={setShowMergeModal}
          handleUpdate={handleUpdate}
        />
      </CustomAccordion>

      <CustomAccordion
        expanded={panelsExpanded.includes("suggestions")}
        onChange={handleChange("suggestions")}
        label="SUGGESTIONS"
        value={`${notReviewedSuggestionSize} of ${suggestionSize}`}
        disabled={suggestionSize === 0}
      >
        <ErrorsAndSuggestions
          isErrors={false}
          currentItemId={currentItemId}
          currentItemIsNode={currentItemIsNode}
          setShowMergeModal={setShowMergeModal}
          handleUpdate={handleUpdate}
        />
      </CustomAccordion>
    </Drawer>
  );
};

export default SecondarySidebar;
