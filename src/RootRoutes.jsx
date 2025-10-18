import { Routes, Route, Navigate } from "react-router-dom";
import ApitonHome from "./ApitonHome.jsx";
import App from "./App.jsx";
import Privacy from "./Privacy.jsx";
import Terms from "./Terms.jsx";
import ProfilePage from "./ProfilePage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import SignInPage from "./SignInPage.jsx";
import SignUpPage from "./SignUpPage.jsx";

export default function RootRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ApitonHome />} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
