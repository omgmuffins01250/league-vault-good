import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import RootRoutes from "./RootRoutes.jsx";
import "./index.css";
import { AppProvider } from "./contexts/AppContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <RootRoutes />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
);
