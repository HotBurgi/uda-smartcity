import { useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";

// Pagina di accesso: autentica utente e reindirizza in base al ruolo.
export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    // Invia credenziali al backend e gestisce il redirect post-login.
    e.preventDefault();
    try {
      const data = await login(username, password);
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: "400px", padding: "2.5rem 2rem" }}
      >
        <div className="text-center mb-4">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                background: "var(--brand)",
                padding: "1rem",
                borderRadius: "50%",
                display: "flex",
              }}
            >
              <Car size={32} color="white" />
            </div>
          </div>
          <h2 style={{ marginBottom: "0.5rem" }}>SmartCity Parking</h2>
          <p style={{ color: "var(--text-muted)" }}>Accedi per continuare</p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(231,76,60,0.1)",
              color: "var(--danger)",
              padding: "0.75rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome utente</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Inserisci il nome utente"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block mt-4"
            style={{ padding: "1rem" }}
          >
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
};
