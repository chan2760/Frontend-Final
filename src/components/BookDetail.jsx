import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

export function BookDetail() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  // MODIFIED: validate Mongo ObjectId format to prevent /api/book/[id] bad requests.
  const isValidBookId = typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

  const [form, setForm] = useState({
    title: "",
    author: "",
    quantity: 0,
    location: "",
    status: "ACTIVE",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    async function fetchBook() {
      if (!isValidBookId) {
        setError("Invalid book URL. Please open a book from the Books page.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const result = await fetch(`${API_URL}/api/books/${id}`, {
          method: "GET",
          credentials: "include",
        });

        if (!result.ok) {
          const payload = await result.json().catch(() => ({}));
          setError(payload.message || "Cannot load book");
          return;
        }

        const payload = await result.json();
        setForm({
          title: payload.title || "",
          author: payload.author || "",
          quantity: payload.quantity ?? 0,
          location: payload.location || "",
          status: payload.status || "ACTIVE",
        });
      } catch {
        setError("Cannot connect to backend");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBook();
  }, [API_URL, id, isValidBookId]);

  async function onSave(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidBookId) {
      setError("Invalid book URL");
      return;
    }

    try {
      const result = await fetch(`${API_URL}/api/books/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          quantity: Number(form.quantity),
          location: form.location,
          status: form.status,
        }),
      });

      if (!result.ok) {
        const payload = await result.json().catch(() => ({}));
        setError(payload.message || "Update failed");
        return;
      }

      setSuccess("Book updated");
    } catch {
      setError("Cannot connect to backend");
    }
  }

  async function onDelete() {
    setError("");
    setSuccess("");

    if (!isValidBookId) {
      setError("Invalid book URL");
      return;
    }

    try {
      const result = await fetch(`${API_URL}/api/books/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!result.ok) {
        const payload = await result.json().catch(() => ({}));
        setError(payload.message || "Delete failed");
        return;
      }

      navigate("/books");
    } catch {
      setError("Cannot connect to backend");
    }
  }

  if (!isAdmin) {
    return <Navigate to="/books" replace />;
  }

  if (isLoading) {
    return <p>Loading book...</p>;
  }

  return (
    <div className="page">
      <h2>Book Detail</h2>
      <p>
        <Link to="/books">Back to Books</Link>
      </p>

      <form className="card form-grid" onSubmit={onSave}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={form.title}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, title: event.target.value }))
          }
          required
        />

        <label htmlFor="author">Author</label>
        <input
          id="author"
          value={form.author}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, author: event.target.value }))
          }
          required
        />

        <label htmlFor="quantity">Quantity</label>
        <input
          id="quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, quantity: event.target.value }))
          }
          required
        />

        <label htmlFor="location">Location</label>
        <input
          id="location"
          value={form.location}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, location: event.target.value }))
          }
          required
        />

        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={form.status}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, status: event.target.value }))
          }
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="DELETED">DELETED</option>
        </select>

        <div className="button-row">
          <button type="submit">Save</button>
          <button type="button" className="danger" onClick={onDelete}>
            Soft Delete
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </div>
  );
}
