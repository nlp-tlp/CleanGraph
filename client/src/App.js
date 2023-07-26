import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useParams,
} from "react-router-dom";
import Interface from "./features/Interface";
import CreateGraph from "./features/CreateGraph";
import { GraphContext, GraphProvider } from "./shared/context";
import Home from "./features/Home";
import { ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { SnackbarProvider } from "./shared/snackbarContext";
import Landing from "./features/Landing";
import { useContext, useEffect } from "react";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GraphProvider>
        <SnackbarProvider>
          <Components />
        </SnackbarProvider>
      </GraphProvider>
    </ThemeProvider>
  );
}

// Title mapping for different routes
const PAGESUFFIX = " | CleanGraph";
const TITLES = {
  "/": "Interactive KG Quality Assurance" + PAGESUFFIX,
  "/home": "Home" + PAGESUFFIX,
  "/create": "Create Graph" + PAGESUFFIX,
};

// Custom hook for setting the document title
function useDocumentTitle() {
  const location = useLocation();
  const { graphId } = useParams();
  const [state] = useContext(GraphContext);

  useEffect(() => {
    // Get title from mapping or use default
    const title =
      TITLES[location.pathname] ||
      `${state.graph.name === "" ? "Loading..." : state.graph.name}` +
        PAGESUFFIX ||
      "Page Not Found";

    // Set document title
    document.title = title;
  }, [location, graphId]);
}

// This component will be a wrapper for all your routes
const PageWrapper = ({ children }) => {
  useDocumentTitle();

  return children;
};

const Components = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <PageWrapper>
                <Landing />
              </PageWrapper>
            }
          />
          <Route
            path="/home"
            element={
              <PageWrapper>
                <Home />
              </PageWrapper>
            }
          />
          <Route
            path="/create"
            element={
              <PageWrapper>
                <CreateGraph />
              </PageWrapper>
            }
          />
          <Route
            path="/:graphId"
            element={
              <PageWrapper>
                <Interface />
              </PageWrapper>
            }
          />
          <Route
            path="*"
            element={
              <PageWrapper>
                <div>Page not found...</div>
              </PageWrapper>
            }
          />
        </Routes>
      </Router>
    </>
  );
};

export default App;
