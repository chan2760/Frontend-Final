import "./App.css";
import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./middleware/RequireAuth";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Books from "./components/Books";
import { BookDetail } from "./components/BookDetail";
import BookBorrow from "./components/BookBorrow";
import { useUser } from "./contexts/UserContext";

function ProtectedPage({ children }) {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useUser();
  const isAdmin = user.role === "ADMIN";
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    // MODIFIED: poll pending INIT requests so admin sees live count on navbar.
    let active = true;

    async function fetchPendingCount() {
      try {
        const result = await fetch(`${API_URL}/api/borrow?status=INIT`, {
          method: "GET",
          credentials: "include",
        });

        if (!result.ok) {
          return;
        }

        const payload = await result.json();
        if (!active) {
          return;
        }

        setPendingCount(Array.isArray(payload.requests) ? payload.requests.length : 0);
      } catch {
        if (active) {
          setPendingCount(0);
        }
      }
    }

    fetchPendingCount();
    const intervalId = setInterval(fetchPendingCount, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [API_URL, isAdmin]);

  return (
    <div className="app-shell">
      <header className="top-nav">
        <Link to="/books">Books</Link>
        <Link to="/borrow" className="nav-link-with-badge">
          {isAdmin ? "Borrow Requests" : "My Borrow Requests"}
          {isAdmin && pendingCount > 0 && (
            <span className="nav-count-pill">{pendingCount}</span>
          )}
        </Link>
        <div className="nav-spacer" />
        <span className="role-pill">{user.role}</span>
        <Link to="/logout">Logout</Link>
      </header>
      <main>{children}</main>
    </div>
  );
}

function HomeRedirect() {
  return <Navigate to="/books" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomeRedirect />
          </RequireAuth>
        }
      />
      <Route
        path="/books"
        element={
          <RequireAuth>
            <ProtectedPage>
              <Books />
            </ProtectedPage>
          </RequireAuth>
        }
      />
      <Route
        path="/books/:id"
        element={
          <RequireAuth>
            <ProtectedPage>
              <BookDetail />
            </ProtectedPage>
          </RequireAuth>
        }
      />
      <Route
        path="/books/[id]"
        element={
          <RequireAuth>
            <Navigate to="/books" replace />
          </RequireAuth>
        }
      />
      <Route
        path="/borrow"
        element={
          <RequireAuth>
            <ProtectedPage>
              <BookBorrow />
            </ProtectedPage>
          </RequireAuth>
        }
      />
      <Route
        path="/logout"
        element={
        <RequireAuth>
          <Logout />
        </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
