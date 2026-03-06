//UserProvider.jsx

import { useEffect, useRef, useState } from "react";
import { UserContext } from "./UserContext";

const INITIAL_USER = {
  isLoggedIn: false,
  id: "",
  username: "",
  email: "",
  role: "USER",
};

export function UserProvider ({children}) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("session");
    if (!raw) {
      return INITIAL_USER;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.isLoggedIn) {
        return {
          ...INITIAL_USER,
          ...parsed,
          isLoggedIn: true,
        };
      }
    } catch {
      // Ignore invalid local storage content.
    }

    return INITIAL_USER;
  });

  const [isLoading, setIsLoading] = useState(true);
  const authActionVersionRef = useRef(0);

  function persistSession(nextUser) {
    if (nextUser.isLoggedIn) {
      localStorage.setItem("session", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("session");
    }
  }

  useEffect(() => {
    async function loadProfile() {
      const requestVersion = authActionVersionRef.current;
      try {
        const result = await fetch(`${API_URL}/api/user/profile`, {
          method: "GET",
          credentials: "include",
        });

        if (authActionVersionRef.current !== requestVersion) {
          return;
        }

        if (!result.ok) {
          setUser(INITIAL_USER);
          persistSession(INITIAL_USER);
          return;
        }

        const data = await result.json();
        if (authActionVersionRef.current !== requestVersion) {
          return;
        }

        const nextUser = {
          isLoggedIn: true,
          id: data.id || "",
          username: data.username || "",
          email: data.email || "",
          role: data.role || "USER",
        };

        setUser(nextUser);
        persistSession(nextUser);
      } catch {
        if (authActionVersionRef.current !== requestVersion) {
          return;
        }
        setUser(INITIAL_USER);
        persistSession(INITIAL_USER);
      } finally {
        if (authActionVersionRef.current === requestVersion) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();
  }, [API_URL]);

  const login = async (email, password) => {
    authActionVersionRef.current += 1;
    try {
      const result = await fetch(`${API_URL}/api/user/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!result.ok) {
        setUser(INITIAL_USER);
        persistSession(INITIAL_USER);
        setIsLoading(false);
        return false;
      }

      const data = await result.json();
      const nextUser = {
        isLoggedIn: true,
        id: data.user?.id || "",
        username: data.user?.username || "",
        email: data.user?.email || "",
        role: data.user?.role || "USER",
      };

      setUser(nextUser);
      persistSession(nextUser);
      setIsLoading(false);
      return true;
    } catch {
      setUser(INITIAL_USER);
      persistSession(INITIAL_USER);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    authActionVersionRef.current += 1;
    try {
      await fetch(`${API_URL}/api/user/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(INITIAL_USER);
      persistSession(INITIAL_USER);
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}
