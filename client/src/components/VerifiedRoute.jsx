import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../store.jsx";

function VerifiedRoute() {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user || user.is_verified !== 1) {
    return <Navigate to="/dashboard?verify=1" replace />;
  }

  return <Outlet />;
}

export default VerifiedRoute;
