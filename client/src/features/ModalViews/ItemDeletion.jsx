import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { ZIndexes } from "../../shared/constants";
import CloseIcon from "@mui/icons-material/Close";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

const ItemDeletion = ({ open, handleClose, data }) => {
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
              <Typography variant="h6">Delete Item(s)</Typography>
              <Tooltip title="Click to close">
                <IconButton onClick={handleClose}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider flexItem />
          <Box p="1rem 2rem">
            <Alert severity="error">
              <Typography gutterBottom>
                Are you sure you want to proceed with this deletion?
              </Typography>
              <Typography gutterBottom>
                {/* A node named <strong>{data.name}</strong> of type{" "}
              <strong>{state.ontologyId2Detail.nodes[data.type].name}</strong>{" "}
              already exists in the graph. This node is currently connected to{" "}
              <strong>{data?.linked_triples ?? 0}</strong> triples. Merging
              will combine shared edges, increase their frequency, and form
              connections to new edges/nodes. */}
              </Typography>
              <Typography gutterBottom>
                Please carefully review this action. Deleting items will lead to
                structural changes in your graph that could significantly affect
                your data analysis or visualization.
              </Typography>
              <Typography variant="subtitle1" color="error">
                Please note: Deleting items is irreversible and permanent. Be
                certain before proceeding.
              </Typography>
            </Alert>
          </Box>
          <Divider flexItem />
          <Box p="1rem 2rem" display="flex" justifyContent="right">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                variant="outlined"
                // onClick={handleCancel}
              >
                Cancel
              </Button>
              <LoadingButton
                variant="contained"
                //   loading={submitting}
                //   onClick={handleNodeMerge}
              >
                Delete
              </LoadingButton>
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDeletion;
