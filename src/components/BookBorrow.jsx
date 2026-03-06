import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

const ADMIN_EDITABLE_STATUSES = [
  "ACCEPTED",
  "CLOSE-NO-AVAILABLE-BOOK",
  "CANCEL-ADMIN",
];

const ADMIN_EDITABLE_FROM_STATUSES = ["INIT"];

const STATUS_CLASS = {
  INIT: "status-init",
  ACCEPTED: "status-accepted",
  "CLOSE-NO-AVAILABLE-BOOK": "status-closed",
  "CANCEL-ADMIN": "status-cancel",
  "CANCEL-USER": "status-cancel",
};

const STATUS_LABEL = {
  INIT: "Pending",
  ACCEPTED: "Accepted",
  "CLOSE-NO-AVAILABLE-BOOK": "Rejected",
  "CANCEL-ADMIN": "Canceled by Admin",
  "CANCEL-USER": "Canceled by User",
};

const STATUS_NOTE = {
  INIT: "Waiting for admin review.",
  ACCEPTED: "Admin approved your borrow request.",
  "CLOSE-NO-AVAILABLE-BOOK": "No available copy for this request.",
  "CANCEL-ADMIN": "Admin canceled this request.",
  "CANCEL-USER": "You canceled this request.",
};

export default function BookBorrow() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const isAdmin = user.role === "ADMIN";
  const pendingInitIdsRef = useRef(new Set());
  const hasLoadedAdminRequestsRef = useRef(false);

  const [books, setBooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [statusDraft, setStatusDraft] = useState({});
  const [targetDate, setTargetDate] = useState("");
  const [bookId, setBookId] = useState(searchParams.get("bookId") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [adminNotice, setAdminNotice] = useState("");
  const [supportsBrowserNotification, setSupportsBrowserNotification] =
    useState(false);
  const [notifyPermission, setNotifyPermission] = useState("default");
  const borrowedRequests = requests.filter(
    (request) => request.requestStatus === "ACCEPTED"
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSupportsBrowserNotification(false);
      return;
    }
    setSupportsBrowserNotification(true);
    setNotifyPermission(Notification.permission);
  }, []);

  async function fetchBooks() {
    if (isAdmin) {
      return;
    }

    try {
      const result = await fetch(`${API_URL}/api/books`, {
        method: "GET",
        credentials: "include",
      });
      if (!result.ok) {
        return;
      }
      const payload = await result.json();
      setBooks(payload.books || []);

      if (!bookId && payload.books?.length > 0) {
        setBookId(payload.books[0].id);
      }
    } catch {
      // Ignore book pre-load failures; request list call handles connectivity feedback.
    }
  }

  async function fetchRequests(options = {}) {
    const { silent = false } = options;

    if (!silent) {
      setIsLoading(true);
    }
    setError("");

    try {
      const result = await fetch(`${API_URL}/api/borrow`, {
        method: "GET",
        credentials: "include",
      });

      if (!result.ok) {
        const payload = await result.json().catch(() => ({}));
        setError(payload.message || "Cannot load borrow requests");
        setRequests([]);
        return;
      }

      const payload = await result.json();
      const nextRequests = payload.requests || [];
      setRequests(nextRequests);

      if (isAdmin) {
        const nextPendingRequests = nextRequests.filter(
          (item) => item.requestStatus === "INIT"
        );
        const nextPendingCount = nextPendingRequests.length;
        const nextPendingIds = new Set(
          nextPendingRequests.map((item) => item.id)
        );
        let addedCount = 0;

        setPendingCount(nextPendingCount);

        if (hasLoadedAdminRequestsRef.current) {
          for (const id of nextPendingIds) {
            if (!pendingInitIdsRef.current.has(id)) {
              addedCount += 1;
            }
          }
        }

        if (addedCount > 0) {
          const notice = `${addedCount} new borrow request${
            addedCount > 1 ? "s" : ""
          } pending`;
          setAdminNotice(notice);

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            // Browser notification helps admin notice new requests while on another tab.
            new Notification("Library Borrow Requests", {
              body: notice,
            });
          }
        }

        pendingInitIdsRef.current = nextPendingIds;
        hasLoadedAdminRequestsRef.current = true;
      } else {
        setPendingCount(0);
      }

      const nextDraft = {};
      const adminEditableSet = new Set(ADMIN_EDITABLE_STATUSES);
      nextRequests.forEach((item) => {
        nextDraft[item.id] = adminEditableSet.has(item.requestStatus)
          ? item.requestStatus
          : "ACCEPTED";
      });
      setStatusDraft(nextDraft);
    } catch {
      setError("Cannot connect to backend");
      setRequests([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchBooks();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    const intervalMs = isAdmin ? 5000 : 8000;
    const intervalId = setInterval(() => {
      fetchRequests({ silent: true });
    }, intervalMs);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminNotice("");
      pendingInitIdsRef.current = new Set();
      hasLoadedAdminRequestsRef.current = false;
    }
  }, [isAdmin]);

  async function enableBrowserNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifyPermission(permission);
  }

  async function onCreateRequest(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const result = await fetch(`${API_URL}/api/borrow`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          targetDate,
        }),
      });

      if (!result.ok) {
        const payload = await result.json().catch(() => ({}));
        setError(payload.message || "Create request failed");
        return;
      }

      setSuccess("Request submitted");
      setTargetDate("");
      fetchRequests();
    } catch {
      setError("Cannot connect to backend");
    }
  }

  async function updateRequestStatus(requestId, status) {
    setError("");
    setSuccess("");

    try {
      const result = await fetch(`${API_URL}/api/borrow`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
        }),
      });

      if (!result.ok) {
        const payload = await result.json().catch(() => ({}));
        setError(payload.message || "Update status failed");
        return;
      }

      setSuccess("Request updated");
      fetchRequests();
    } catch {
      setError("Cannot connect to backend");
    }
  }

  return (
    <div className="page">
      <h2>{isAdmin ? "Borrow Request Management" : "My Borrow Requests"}</h2>

      {!isAdmin && (
        <section className="card">
          <h3>Create Borrow Request</h3>
          <form className="inline-form" onSubmit={onCreateRequest}>
            <select
              value={bookId}
              onChange={(event) => setBookId(event.target.value)}
              required
            >
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} by {book.author} ({book.quantity} left)
                </option>
              ))}
            </select>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              required
            />
            <button type="submit">Create Request</button>
          </form>
        </section>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {isAdmin && (
        <section className="card notice-card">
          <div className="notice-row">
            <strong>
              Pending Requests
              <span className="count-pill">{pendingCount}</span>
            </strong>
            {supportsBrowserNotification && notifyPermission !== "granted" && (
              <button type="button" onClick={enableBrowserNotifications}>
                Enable Browser Notification
              </button>
            )}
          </div>
          {adminNotice ? (
            <p className="notice-text">{adminNotice}</p>
          ) : (
            <p className="muted">No new request notification</p>
          )}
        </section>
      )}

      <section className="card">
        <h3>{isAdmin ? "All User Borrowed Books" : "My Borrowed Books"}</h3>
        {isLoading ? (
          <p>Loading borrowed books...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {isAdmin && <th>User ID</th>}
                <th>Book</th>
                <th>Target Date</th>
                <th>Approved At</th>
              </tr>
            </thead>
            <tbody>
              {borrowedRequests.map((request) => (
                <tr key={`borrowed-${request.id}`}>
                  {isAdmin && <td>{request.userId}</td>}
                  <td>
                    {request.book
                      ? `${request.book.title} (${request.book.author})`
                      : request.bookId || "-"}
                  </td>
                  <td>
                    {request.targetDate
                      ? new Date(request.targetDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    {request.updatedAt
                      ? new Date(request.updatedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
              {borrowedRequests.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="muted">
                    No borrowed books found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="card-title-row">
          <h3>{isAdmin ? "All Requests" : "Request History"}</h3>
          <button type="button" onClick={fetchRequests}>
            Refresh
          </button>
        </div>
        {isLoading ? (
          <p>Loading requests...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {isAdmin && <th>User ID</th>}
                <th>Book</th>
                <th>Target Date</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  {isAdmin && <td>{request.userId}</td>}
                  <td>
                    {request.book
                      ? `${request.book.title} (${request.book.author})`
                      : request.bookId || "-"}
                  </td>
                  <td>
                    {request.targetDate
                      ? new Date(request.targetDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    {request.updatedAt
                      ? new Date(request.updatedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        STATUS_CLASS[request.requestStatus] || "status-init"
                      }`}
                    >
                      {STATUS_LABEL[request.requestStatus] ||
                        request.requestStatus}
                    </span>
                    {!isAdmin && (
                      <p className="status-note">
                        {STATUS_NOTE[request.requestStatus] || ""}
                      </p>
                    )}
                  </td>
                  <td>
                    {isAdmin ? (
                      !ADMIN_EDITABLE_FROM_STATUSES.includes(
                        request.requestStatus
                      ) ? (
                        <span className="muted">Final</span>
                      ) : (
                        <div className="inline-form">
                          <select
                            value={statusDraft[request.id] || "ACCEPTED"}
                            onChange={(event) =>
                              setStatusDraft((prev) => ({
                                ...prev,
                                [request.id]: event.target.value,
                              }))
                            }
                          >
                            {ADMIN_EDITABLE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              updateRequestStatus(
                                request.id,
                                statusDraft[request.id] || "ACCEPTED"
                              )
                            }
                          >
                            Update
                          </button>
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={
                          !["INIT", "ACCEPTED"].includes(request.requestStatus)
                        }
                        onClick={() =>
                          updateRequestStatus(request.id, "CANCEL-USER")
                        }
                      >
                        Cancel Request
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="muted">
                    No borrow requests found
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
