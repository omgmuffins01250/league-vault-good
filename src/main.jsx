import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import RootRoutes from "./RootRoutes.jsx";
import "./index.css";
import { AppProvider } from "./contexts/AppContext.jsx";
import { store } from "./store/store";
import { upsertLeagueFromExtension } from "./store/leagueSlice";
import {
  encodePayloadForWindowName,
  parsePayloadString,
} from "./utils/payloadEncoding";

if (typeof window !== "undefined") {
  const existing = window.FL_ADD_LEAGUE;
  window.FL_ADD_LEAGUE = function addLeague(payload) {
    if (typeof existing === "function" && existing !== addLeague) {
      existing(payload);
    }
    if (!payload || typeof payload !== "object") return;
    store.dispatch(upsertLeagueFromExtension(payload));
    try {
      if (typeof window.FL_HANDLE_EXTENSION_PAYLOAD === "function") {
        window.FL_HANDLE_EXTENSION_PAYLOAD(payload);
      } else {
        const encoded = encodePayloadForWindowName(payload);
        if (encoded) {
          window.name = encoded;
        }
      }
    } catch (error) {
      console.warn("Failed to hand payload to app", error);
    }
  };

  try {
    const payload = parsePayloadString(window.name);
    if (payload && typeof payload === "object") {
      store.dispatch(upsertLeagueFromExtension(payload));
    }
  } catch (error) {
    console.warn("Failed to import league data from window.name", error);
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <RootRoutes />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
);
