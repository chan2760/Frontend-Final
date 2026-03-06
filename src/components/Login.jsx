//You can modify this component.

import { useState } from "react";
import { useUser } from "../contexts/UserContext";
import { Navigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoginError, setIsLoginError] = useState(false);

  const { user, isLoading, login } = useUser();

  async function onLogin(event) {
    event.preventDefault();

    setIsLoggingIn(true);
    setIsLoginError(false);

    const result = await login(email, password);
    setIsLoggingIn(false);
    setIsLoginError(!result);
  }

  if (isLoading) {
    return <p>Loading session...</p>;
  }

  if (user.isLoggedIn) {
    return <Navigate to="/books" replace />;
  }

  return (
    <div className="page">
      <div className="card card-narrow">
        <h2>Library Login</h2>
        <p className="muted">Use one of the required exam accounts to sign in.</p>

        <form onSubmit={onLogin} className="form-grid">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
        </form>

        {isLoginError && <p className="error">Invalid email or password</p>}

        <div className="hint-box">
          <div><strong>ADMIN</strong>: admin@test.com / admin123</div>
          <div><strong>USER</strong>: user@test.com / user123</div>
        </div>
      </div>
    </div>
  );
}
