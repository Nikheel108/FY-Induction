import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { FullPageSpinner } from "./Spinner";

/**
 * Route guard for admin-only pages.
 *
 * On mount it validates the stored token against the backend; while checking it
 * shows a spinner. Unauthenticated users are redirected to the admin login.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, checkAuth } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const ok = await checkAuth();
      if (active) setChecked(ok);
    };
    if (isAuthenticated) {
      run();
    } else {
      setChecked(false);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!checked) {
    return <FullPageSpinner />;
  }

  return children;
}
