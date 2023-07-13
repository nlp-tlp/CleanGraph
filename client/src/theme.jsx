import { createTheme } from "@mui/material";
import { grey } from "@mui/material/colors";

export const theme = createTheme({
  palette: {
    primary: {
      main: grey[500], // choose the main color
      light: grey[200], // lighter version
      dark: grey[700], // darker version
      darker: grey[800], // darkest version
    },
  },
});
