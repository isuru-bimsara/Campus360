import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setAuthHeader = (token) => {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthHeader(token);
      api
        .get("/auth/me")
        .then((res) => setUser(res.data.data))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
          delete api.defaults.headers.common["Authorization"];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithToken = (token) => {
    localStorage.setItem("token", token);
    setAuthHeader(token);
    return api.get("/auth/me").then((res) => {
      setUser(res.data.data);
      return res.data.data;
    });
  };

  const loginWithCredentials = (email, password) =>
    api.post("/auth/login", { email, password }).then((res) =>
      loginWithToken(res.data.data.token),
    );

  const loginWithGoogle = (googleToken) =>
    api.post("/auth/google", { token: googleToken }).then((res) =>
      loginWithToken(res.data.data.token),
    );

  const register = (email, name, password) =>
    api.post("/auth/register", { email, name, password }).then((res) =>
      loginWithToken(res.data.data.token),
    );

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  };

  // ✅ NEW: allow pages to update global user immediately (e.g., profile edit)
  const updateUser = (nextUser) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithToken,
        loginWithCredentials,
        loginWithGoogle,
        register,
        logout,
        setUser: updateUser,
        updateUser, // ✅ exposed
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
