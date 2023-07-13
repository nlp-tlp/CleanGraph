// Defaults to central node but will switch based on left click action on nodes.

import React, { useContext, useState, useEffect } from "react";
import {
  Typography,
  Stack,
  TextField,
  Box,
  MenuItem,
  Tooltip,
  alpha,
  Divider,
  IconButton,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { GraphContext } from "../../shared/context";
import { updateNode } from "../../shared/api";
import LoadingButton from "@mui/lab/LoadingButton";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { styled, useTheme } from "@mui/material/styles";

const CustomTextField = styled(TextField)({
  backgroundColor: "white",
});

const Properties = () => {
  const theme = useTheme();
  const [{ currentNode, ontologyName2Id, ontology }, dispatch] =
    useContext(GraphContext);
  const [nodeName, setNodeName] = useState(currentNode?.name || "");
  const [nodeType, setNodeType] = useState(currentNode?.type || "");
  const [loading, setLoading] = useState(false);

  const nodeChanged =
    nodeName !== currentNode?.name || nodeType !== currentNode?.type;

  useEffect(() => {
    if (currentNode) {
      setNodeName((prevNodeName) => currentNode?.name || prevNodeName);
      setNodeType((prevNodeType) => currentNode?.type || prevNodeType);
    }
  }, [currentNode]);

  const handleUpdate = async (nodeId) => {
    setLoading(true);
    try {
      const payload = {
        name: nodeName,
        type: ontologyName2Id[nodeType],
        is_active: currentNode.is_active,
        is_reviewed: currentNode.is_reviewed,
      };

      await updateNode(nodeId, payload);

      dispatch({
        type: "UPDATE_NODE",
        payload: { id: nodeId, ...payload, typeName: nodeType }, // typeName is the name associated with the ontology type
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const unselectCurrentNode = () => {
    dispatch({
      type: "SET_VALUE",
      payload: {
        key: "currentNode",
        value: null,
      },
    });
  };

  return (
    <Box display="flex" flexDirection="column" sx={{ height: "100%" }}>
      <Box p={2}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography sx={{ fontWeight: 700 }}>Information</Typography>
          <Tooltip title="Click to close">
            <IconButton onClick={unselectCurrentNode}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1 }}>
        {currentNode && currentNode.id ? (
          <Stack
            direction="column"
            alignItems="center"
            justifyContent="center"
            mt={1}
            p={1}
            spacing={2}
          >
            <Tooltip
              title="This is the name or label of the node"
              placement="left"
            >
              <CustomTextField
                id="property-name-select-field"
                label="Label"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                required
                variant="outlined"
                size="small"
                fullWidth
                margin="normal"
              />
            </Tooltip>
            <Tooltip title="This is the class of the node" placement="left">
              <CustomTextField
                id="property-class-select-field"
                select
                fullWidth
                label="Class"
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value)}
                size="small"
                margin="normal"
              >
                {ontology
                  .filter((i) => i.is_entity)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((i) => (
                    <MenuItem
                      value={i.name}
                      key={i.id}
                      // sx={{
                      //   bgcolor: alpha(i.color, 0.25),
                      //   // borderTop: `1px solid ${i.color}`,
                      // }}
                    >
                      {i.name}
                    </MenuItem>
                  ))}
              </CustomTextField>
            </Tooltip>
            <Box>
              <Accordion
                variant="outlined"
                style={{ borderColor: "lightgray" }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="properties-content"
                  id="properties-header"
                >
                  <Typography>Properties</Typography>
                </AccordionSummary>
                <AccordionDetails
                  style={{ overflowY: "auto", maxHeight: 100 }}
                  // sx={{ height: "calc(100% - 50px)", overflowY: "auto" }}
                >
                  <Typography>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Suspendisse malesuada lacus ex, sit amet blandit leo
                    lobortis eget.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
            <Box
              sx={{ display: "flex", justifyContent: "right", width: "100%" }}
            >
              <LoadingButton
                variant="contained"
                size="small"
                disabled={!nodeChanged}
                onClick={() => handleUpdate(currentNode.id)}
                loading={loading}
              >
                Update
              </LoadingButton>
            </Box>
          </Stack>
        ) : (
          <Box p="1rem 0rem">
            <Typography>Nothing Selected</Typography>
          </Box>
        )}
      </Box>
      <Divider />
      <Box p={1}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="center"
        >
          <Tooltip title="Click to delete/deactivate this item">
            <Button
              onClick={() => console.log("TODO: activate this function.")}
              startIcon={<DeleteIcon />}
              variant="outlined"
              size="small"
              // sx={{ color: ICON_COLOR }}
            >
              Delete
            </Button>
          </Tooltip>
          <Tooltip title="Click to set this item as reviewed">
            <Button
              startIcon={<CheckBoxIcon />}
              onClick={() => console.log("TODO: activate this function.")}
              // sx={{ color: ICON_COLOR }}
              variant="outlined"
              size="small"
            >
              Review
            </Button>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
};

export default Properties;
