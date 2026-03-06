import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

export default function Books() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useUser();
  const isAdmin = user.role === "ADMIN";

  const [filters, setFilters] = useState({
    title: "",
    author: "",
  });
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    quantity: "",
    location: "",
  });

  async function fetchBooks() {
    setIsLoading(true);
    setError("");

    const searchParams = new URLSearchParams();
    if (filters.title.trim()) {
      searchParams.set("title", filters.title.trim());
    }
    if (filters.author.trim()) {
      searchParams.set("author", filters.author.trim());
    }
    if (isAdmin && includeDeleted) {
      searchParams.set("includeDeleted", "true");
    }

    const query = searchParams.toString();
    const url = `${API_URL}/api/books${query ? `?${query}` : ""}`;

    try {
      const result = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!result.ok) {
        const payload = await result.json().catch(() => ({}));
        setError(payload.message || "Failed to load books");
        setBooks([]);
        return;
      }

      const payload = await result.json();
      setBooks(payload.books || []);
    } catch {
      setError("Cannot connect to backend");
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted, isAdmin]);

  async function onCreateBook(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const quantity = Number(newBook.quantity);

    try {
      const result = await fetch(`${API_URL}/api/books`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newBook.title,
          author: newBook.author,
          quantity,
          location: newBook.location,
        }),
      });

      if (!result.ok) {
        const payload = await result.json().catch(() => ({}));
        setError(payload.message || "Create book failed");
        return;
      }

      setSuccess("Book created");
      setNewBook({
        title: "",
        author: "",
        quantity: "",
        location: "",
      });
      fetchBooks();
    } catch {
      setError("Cannot connect to backend");
    }
  }

  return (
    <div className="page">
      <h2>Book Management</h2>

      <section className="card">
        <h3>Search</h3>
        <div className="inline-form">
          <input
            type="text"
            placeholder="Title"
            value={filters.title}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, title: event.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Author"
            value={filters.author}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, author: event.target.value }))
            }
          />
          <button onClick={fetchBooks} disabled={isLoading}>
            Search
          </button>
        </div>
        {isAdmin && (
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(event) => setIncludeDeleted(event.target.checked)}
            />
            Show deleted books
          </label>
        )}
      </section>

      {isAdmin && (
        <section className="card">
          <h3>Create Book</h3>
          <form className="inline-form" onSubmit={onCreateBook}>
            <input
              type="text"
              placeholder="Title"
              value={newBook.title}
              onChange={(event) =>
                setNewBook((prev) => ({ ...prev, title: event.target.value }))
              }
              required
            />
            <input
              type="text"
              placeholder="Author"
              value={newBook.author}
              onChange={(event) =>
                setNewBook((prev) => ({ ...prev, author: event.target.value }))
              }
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Quantity"
              value={newBook.quantity}
              onChange={(event) =>
                setNewBook((prev) => ({ ...prev, quantity: event.target.value }))
              }
              required
            />
            <input
              type="text"
              placeholder="Location"
              value={newBook.location}
              onChange={(event) =>
                setNewBook((prev) => ({ ...prev, location: event.target.value }))
              }
              required
            />
            <button type="submit">Create</button>
          </form>
        </section>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <section className="card">
        <h3>Books</h3>
        {isLoading ? (
          <p>Loading books...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Quantity</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.quantity}</td>
                  <td>{book.location}</td>
                  <td>{book.status}</td>
                  <td>
                    {isAdmin ? (
                      <Link to={`/books/${book.id}`}>Manage</Link>
                    ) : (
                      <Link to={`/borrow?bookId=${book.id}`}>Borrow</Link>
                    )}
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No books found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
