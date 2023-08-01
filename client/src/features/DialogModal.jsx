import React, { useContext } from "react";
import { Dialog, DialogContent } from "@mui/material";
import { GraphContext } from "../shared/context";
import Legend from "./ModalViews/Legend";
import Settings from "./ModalViews/Settings";
import Help from "./ModalViews/Help";
import { ZIndexes } from "../shared/constants";
import ErrorsOrSuggestions from "./ModalViews/ErrorsOrSuggestions";

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
      case "errors":
        return (
          <ErrorsOrSuggestions context={"errors"} handleClose={handleClose} />
        );
      case "suggestions":
        return (
          <ErrorsOrSuggestions
            context={"suggestions"}
            handleClose={handleClose}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={state.modal.open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: 4,
          zIndex: ZIndexes.level3,
        },
      }}
      maxWidth={1600}
    >
      <DialogContent sx={{ maxHeight: 1000 }}>{renderView()}</DialogContent>
    </Dialog>
  );
};

export default DialogModal;
