import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Dialog,
  DialogContent,
  Alert,
} from "@mui/material";
import React, { useContext, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { GraphContext } from "../../shared/context";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";
import { getSubgraph, mergeNode } from "../../shared/api";
import { useParams } from "react-router-dom";
import { SnackbarContext } from "../../shared/snackbarContext";
import { ZIndexes } from "../../shared/constants";

const NodeMerge = ({ open, handleClose, data }) => {
  const [state, dispatch] = useContext(GraphContext);
  const { graphId } = useParams();
  const { openSnackbar } = useContext(SnackbarContext);
  const [submitting, setSubmitting] = useState(false);

  const handleNodeMerge = async () => {
    try {
      setSubmitting(true);
      const response = await mergeNode(data.itemId, data.name, data.type);
      if (response.status === 200) {
        if (response.data.item_modified) {
          handleClose();
          dispatch({ type: "MERGE_NODES", payload: response.data });
          openSnackbar("success", "Success", "Successfully merged nodes");
          // Reload the page with the new node as the centralNodeId... easier than updating state...
          const response2 = await getSubgraph({
            graphId: graphId,
            nodeId: response.data.new_node._id,
            page: 0,
            limit: state.settings.graph.limit,
          });

          if (response2.status === 200) {
            dispatch({ type: "SET_SUBGRAPH", payload: response2.data });
          } else {
            throw new Error();
          }
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      openSnackbar("error", "Error", "Unable to merge nodes");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: 4,
          zIndex: ZIndexes.level3,
        },
      }}
    >
      <DialogContent sx={{ p: 0, m: 0, maxWidth: 1200, maxHeight: 1000 }}>
        <Box>
          <Box p="1rem 2rem">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">Node Conflict Detected</Typography>
              <Tooltip title="Click to close">
                <IconButton onClick={handleClose}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider flexItem />
          <Box p="1rem 2rem">
            <Alert severity="warning">
              <Typography gutterBottom>
                Are you sure you want to merge the nodes?
              </Typography>
              <Typography gutterBottom>
                A node named <strong>{data.name}</strong> of type{" "}
                <strong>{state.ontologyId2Detail.nodes[data.type].name}</strong>{" "}
                already exists in the graph. This node is currently connected to{" "}
                <strong>{data?.linked_triples ?? 0}</strong> triples. Merging
                will combine shared edges, increase their frequency, and form
                connections to new edges/nodes.
              </Typography>
              <Typography gutterBottom>
                Please carefully review this action. Merging nodes will lead to
                structural changes in your graph that could significantly affect
                your data analysis or visualization.
              </Typography>
              <Typography variant="subtitle1" color="error">
                Please note: Merging nodes is irreversible and permanent. Be
                certain before proceeding.
              </Typography>
            </Alert>
          </Box>
          <Divider flexItem />
          <Box p="1rem 2rem" display="flex" justifyContent="right">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button variant="outlined" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton
                variant="contained"
                loading={submitting}
                onClick={handleNodeMerge}
              >
                Merge
              </LoadingButton>
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default NodeMerge;
