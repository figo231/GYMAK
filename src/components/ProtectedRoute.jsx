import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Only wraps screens that genuinely require a signed-in user (currently:
 * /account). The rest of the app — Dashboard, Exercises, Stats, Profile,
 * etc. — intentionally stays reachable without an account, since local
 * users must keep working exactly as before (see the Phase 3 requirements:
 * "keep backward compatibility with existing localStorage users").
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="bg-ambient" />; // avoid a flash-redirect while the session is still loading
  }
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
