import { useEffect, useState } from "react";

import api from "../api";
import { useAuth } from "../store.jsx";

function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, listingsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/pending-users"),
        api.get("/admin/listings")
      ]);
      setStats(statsRes.data);
      setPendingUsers(pendingRes.data || []);
      setListings(listingsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData();
    }
  }, [user]);

  const handleVerify = async (userId, action) => {
    await api.put(`/admin/verify-user/${userId}`, { action });
    loadAdminData();
  };

  const deleteListing = async (listingId) => {
    await api.delete(`/admin/listings/${listingId}`);
    loadAdminData();
  };

  if (user?.role !== "admin") {
    return <p className="text-sm text-rose-600">Admin access required.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Monitor platform activity.</p>
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading admin data...</p>}

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total users", value: stats.totalUsers },
            { label: "Verified users", value: stats.verifiedUsers },
            { label: "Total listings", value: stats.totalListings },
            { label: "Active listings", value: stats.activeListings },
            { label: "Transactions", value: stats.totalTransactions },
            { label: "Completed", value: stats.completedTransactions }
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
        <h2 className="text-lg font-semibold">Pending verifications</h2>
        {pendingUsers.length === 0 && <p className="mt-4 text-sm text-[var(--muted)]">All clear.</p>}
        <div className="mt-4 space-y-3">
          {pendingUsers.map((pending) => (
            <div
              key={pending.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-3"
            >
              <div>
                <p className="text-sm font-semibold">{pending.name}</p>
                <p className="text-xs text-[var(--muted)]">{pending.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerify(pending.id, "approve")}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleVerify(pending.id, "reject")}
                  className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
        <h2 className="text-lg font-semibold">All listings</h2>
        <div className="mt-4 space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-3"
            >
              <div>
                <p className="text-sm font-semibold">{listing.title}</p>
                <p className="text-xs text-[var(--muted)]">Seller: {listing.seller_name}</p>
              </div>
              <button
                onClick={() => deleteListing(listing.id)}
                className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Admin;
