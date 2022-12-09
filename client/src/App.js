import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Interface from "./features/Interface";
import CreateGraph from "./features/CreateGraph";
import { GraphProvider } from "./shared/context";
import Home from "./features/Home";

function App() {
  return (
    <GraphProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateGraph />} />
          <Route path="/:graphId" element={<Interface />} />
          <Route path="*" element={<div>Page not found...</div>} />
        </Routes>
      </Router>
    </GraphProvider>
  );
}

export default App;
