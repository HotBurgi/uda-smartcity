import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { LogOut, CarFront } from "lucide-react";

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const roleLabel = isAdmin ? "amministratore" : "utente";

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <CarFront color="var(--brand)" />
          <span>SmartCity</span>
        </div>

        <div className="nav-links">
          {isAdmin ? (
            <>
              <Link
                to="/admin"
                className={location.pathname === "/admin" ? "active" : ""}
              >
                Aree
              </Link>
              <Link
                to="/admin/history"
                className={
                  location.pathname === "/admin/history" ? "active" : ""
                }
              >
                Tutte le prenotazioni
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className={location.pathname === "/dashboard" ? "active" : ""}
              >
                Parcheggi
              </Link>
              <Link
                to="/history"
                className={location.pathname === "/history" ? "active" : ""}
              >
                Le mie prenotazioni
              </Link>
            </>
          )}

          <div
            style={{
              width: "1px",
              height: "24px",
              background: "var(--border-color)",
              margin: "0 0.5rem",
            }}
          ></div>

          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Ciao,{" "}
            <strong style={{ color: "var(--text-main)" }}>
              {user.username}
            </strong>
            <span
              className="badge badge-neutral"
              style={{
                marginLeft: "0.5rem",
                background: isAdmin ? "var(--brand)" : "",
              }}
            >
              {roleLabel}
            </span>
          </span>

          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: "0.5rem", borderRadius: "50%" }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="container" style={{ marginTop: "2rem" }}>
        <Outlet />
      </main>
    </>
  );
};
