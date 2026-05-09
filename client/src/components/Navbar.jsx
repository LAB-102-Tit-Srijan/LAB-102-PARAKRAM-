import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import api from "../api";
import { useAuth } from "../store.jsx";

function Navbar() {
  const { user, logout } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    let active = true;
    const loadUnread = async () => {
      try {
        const response = await api.get("/messages/conversations");
        const totalUnread = (response.data || []).reduce(
          (sum, conversation) => sum + (conversation.unread_count || 0),
          0
        );
        if (active) {
          setHasUnread(totalUnread > 0);
        }
      } catch (error) {
        if (active) {
          setHasUnread(false);
        }
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  const linkClass = ({ isActive }) =>
    `rounded-full px-3 py-1 text-sm font-medium transition ${
      isActive ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
    }`;

  return (
    <nav className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
            CL
          </div>
          <div>
            <p className="text-lg font-semibold">Campus Loop</p>
            <p className="text-xs text-[var(--muted)]">Buy, sell, rent within campus</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <NavLink to="/listings" className={linkClass}>
            Listings
          </NavLink>
          {user && (
            <NavLink to="/create" className={linkClass}>
              Create
            </NavLink>
          )}
          {user && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}
          {user && (
            <NavLink to="/messages" className={linkClass}>
              <span className="relative inline-flex items-center">
                Messages
                {hasUnread && (
                  <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </span>
            </NavLink>
          )}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!user && (
            <>
              <Link
                to="/login"
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white"
              >
                Register
              </Link>
            </>
          )}
          {user && (
            <>
              <div className="hidden text-sm text-[var(--muted)] md:block">Hi, {user.name}</div>
              <button
                onClick={logout}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
