import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    roll_number: "",
    department: "",
    year: "",
    password: ""
  });
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
      await api.post("/auth/register", {
        ...form,
        year: form.year ? Number(form.year) : null
      });
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Create your Campus Loop account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Register with your student details.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Full name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
              placeholder="Student name"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Roll number</label>
            <input
              name="roll_number"
              value={form.roll_number}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
              placeholder="STU-0001"
              required
            />
          </div>
        </div>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Department</label>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
              placeholder="CSE"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Year</label>
            <input
              name="year"
              type="number"
              value={form.year}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
              placeholder="2"
              min="1"
              max="6"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
            placeholder="Create a password"
            required
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[var(--ink)]">
          Login
        </Link>
      </p>
    </div>
  );
}

export default Register;
