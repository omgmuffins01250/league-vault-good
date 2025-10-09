// src/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "./auth";

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (auth.isSignedIn()) return children;
  return <Navigate to="/" state={{ from: loc.pathname }} replace />;
}
