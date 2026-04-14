import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { Layout } from "./Layout";
import { Login } from "./pages/Login";
import { UserDashboard } from "./pages/UserDashboard";
import { UserHistory } from "./pages/UserHistory";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminHistory } from "./pages/AdminHistory";
import { AdminTrends } from "./pages/AdminTrends";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (user === undefined) return <div>Caricamento...</div>; // Still checking auth? In context we handle loading

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
    );
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={
          !user ? (
            <Login />
          ) : (
            <Navigate
              to={user.role === "admin" ? "/admin" : "/dashboard"}
              replace
            />
          )
        }
      />
      <Route
        path="/"
        element={
          <Navigate
            to={
              user
                ? user.role === "admin"
                  ? "/admin"
                  : "/dashboard"
                : "/login"
            }
            replace
          />
        }
      />

      <Route element={<Layout />}>
        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserHistory />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/history"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trends/:areaId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTrends />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
