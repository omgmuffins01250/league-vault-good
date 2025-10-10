// src/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAppContext } from "./contexts/AppContext.jsx";

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  const { isSignedIn } = useAppContext();
  if (isSignedIn) return children;
  const redirectPath = loc.pathname + loc.search + loc.hash;
  return (
    <Navigate to="/signin" state={{ from: redirectPath }} replace />
  );
}
