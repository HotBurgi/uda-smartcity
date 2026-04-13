import { createContext, useState, useEffect, useContext } from 'react';
import { apiClient } from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiClient('/me');
        setUser(data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const data = await apiClient('/login', {
      method: 'POST',
      body: { username, password }
    });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await apiClient('/logout', { method: 'POST' });
    setUser(null);
  };

  if (loading) return <div className="container text-center mt-4">Loading application...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
