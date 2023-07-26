import { createContext, useState } from "react";
import { Alert, AlertTitle, Snackbar } from "@mui/material";
import { styled } from "@mui/material/styles";
import { ZIndexes } from "./constants";

const StyledAlert = styled(Alert)({
  "&::first-letter": {
    textTransform: "capitalize",
  },
});

export const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    severity: "info",
    title: "",
    message: "",
  });

  const openSnackbar = (severity, title, message) => {
    setNotification({ open: true, severity, title, message });
  };

  const closeSnackbar = () => {
    setNotification({ ...notification, open: false });
  };
  return (
    <SnackbarContext.Provider value={{ openSnackbar, closeSnackbar }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: ZIndexes.level4 }}
      >
        <StyledAlert
          onClose={closeSnackbar}
          severity={notification.severity}
          // variant="filled"
          sx={{ textTransform: "capitalize" }}
        >
          <AlertTitle>{notification.title}</AlertTitle>
          {notification.message}
        </StyledAlert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
