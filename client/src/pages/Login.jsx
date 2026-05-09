import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import api from "../api";
import { useAuth } from "../store.jsx";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);
      login(response.data.token, response.data.user);
      const redirectTo = location.state?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Login to continue trading on Campus Loop.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
            placeholder="student@university.edu"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        New to Campus Loop?{" "}
        <Link to="/register" className="font-semibold text-[var(--ink)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default Login;
