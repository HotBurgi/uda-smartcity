import { createContext, useState, useEffect, useContext } from "react";
import { apiClient } from "./api";

const AuthContext = createContext();

// Provider autenticazione: mantiene stato utente e operazioni login/logout.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al mount verifica se esiste una sessione lato server.
    const checkAuth = async () => {
      try {
        const data = await apiClient("/me");
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    // Effettua login e aggiorna il profilo nel contesto.
    const data = await apiClient("/login", {
      method: "POST",
      body: { username, password },
    });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    // Effettua logout e pulisce il contesto locale.
    await apiClient("/logout", { method: "POST" });
    setUser(null);
  };

  if (loading)
    return (
      <div className="container text-center mt-4">
        Caricamento applicazione...
      </div>
    );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
