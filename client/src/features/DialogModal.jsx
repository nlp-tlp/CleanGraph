import React, { useContext } from "react";
import { Box, Modal, Paper } from "@mui/material";
import { GraphContext } from "../shared/context";
import Legend from "./ModalViews/Legend";
import Settings from "./ModalViews/Settings";
import Help from "./ModalViews/Help";

const DialogModal = () => {
  const [state, dispatch] = useContext(GraphContext);

  const handleClose = () => {
    dispatch({ type: "TOGGLE_MODAL" });
  };

  const renderView = () => {
    switch (state.modal.view) {
      case "legend":
        return <Legend handleClose={handleClose} />;
      case "settings":
        return <Settings handleClose={handleClose} />;
      case "help":
        return <Help handleClose={handleClose} />;
      default:
        return null;
    }
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    maxHeight: 600,
    // overflowY: "auto",
    bgcolor: "background.paper",
    border: "2px solid",
    borderColor: "lightgrey",
    boxShadow: 24,
    p: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: 4,
  };

  return (
    <Modal open={state.modal.open} onClose={handleClose}>
      <Box sx={modalStyle} as={Paper} variant="outlined">
        {renderView()}
      </Box>
    </Modal>
  );
};

export default DialogModal;
