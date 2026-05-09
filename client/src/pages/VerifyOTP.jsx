import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../api";
import { useAuth } from "../store.jsx";

function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/verify-otp", { email, otp });
      login(response.data.token, response.data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Verify your account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Enter the 6-digit OTP from the server console to activate your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-[var(--muted)]">OTP</label>
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
            placeholder="6-digit code"
            required
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>
    </div>
  );
}

export default VerifyOTP;
