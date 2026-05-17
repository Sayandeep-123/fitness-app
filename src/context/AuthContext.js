import React, { createContext, useContext, useEffect, useState } from "react";
import { clearToken, getToken } from "../api/client";
import { getMe } from "../api/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getToken();
        if (token) {
          const { user: me } = await getMe();
          setUser(me);
        }
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = (userData) => setUser(userData);

  const updateUser = (userData) => setUser(userData);

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
