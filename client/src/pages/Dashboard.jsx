import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../api";
import ListingCard from "../components/ListingCard";
import { useAuth } from "../store.jsx";

function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistLoaded, setWishlistLoaded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [priceDraft, setPriceDraft] = useState("");

  const showVerifyBanner = searchParams.get("verify") === "1" || user?.is_verified !== 1;

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [listingsRes, transactionsRes] = await Promise.all([
          api.get("/listings/my"),
          api.get("/transactions/my")
        ]);
        if (active) {
          setListings(listingsRes.data || []);
          setTransactions(transactionsRes.data || []);
        }
      } catch (error) {
        if (active) {
          setListings([]);
          setTransactions([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "wishlist" || wishlistLoaded) {
      return;
    }

    let active = true;
    const loadWishlist = async () => {
      setWishlistLoading(true);
      try {
        const response = await api.get("/wishlist");
        if (active) {
          setWishlist(response.data || []);
          setWishlistLoaded(true);
        }
      } catch (error) {
        if (active) {
          setWishlist([]);
        }
      } finally {
        if (active) {
          setWishlistLoading(false);
        }
      }
    };

    loadWishlist();
    return () => {
      active = false;
    };
  }, [tab, wishlistLoaded]);

  const removeListing = async (listingId) => {
    await api.delete(`/listings/${listingId}`);
    setListings((prev) => prev.map((item) => (item.id === listingId ? { ...item, is_available: 0 } : item)));
  };

  const markComplete = async (transactionId) => {
    await api.put(`/transactions/${transactionId}/complete`);
    setTransactions((prev) =>
      prev.map((item) => (item.id === transactionId ? { ...item, status: "COMPLETED" } : item))
    );
  };

  const cancelTransaction = async (transactionId) => {
    await api.put(`/transactions/${transactionId}/cancel`);
    setTransactions((prev) =>
      prev.map((item) => (item.id === transactionId ? { ...item, status: "CANCELLED" } : item))
    );
  };

  const startEditPrice = (listing) => {
    setEditingId(listing.id);
    setPriceDraft(String(listing.price));
  };

  const savePrice = async (listingId) => {
    const nextPrice = Number(priceDraft);
    if (!nextPrice || Number.isNaN(nextPrice)) {
      return;
    }

    await api.put(`/listings/${listingId}`, { price: nextPrice });
    setListings((prev) => prev.map((item) => (item.id === listingId ? { ...item, price: nextPrice } : item)));
    setEditingId(null);
  };

  const removeWishlistItem = async (listingId) => {
    await api.delete(`/wishlist/${listingId}`);
    setWishlist((prev) => prev.filter((item) => item.id !== listingId));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Track listings and transactions in one place.</p>
      </div>

      {showVerifyBanner && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Your account is pending verification. Ask an admin to approve your profile before listing items.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {[
          { key: "listings", label: "My listings" },
          { key: "transactions", label: "My transactions" },
          { key: "wishlist", label: "Wishlist" }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item.key ? "bg-[var(--ink)] text-white" : "border border-[var(--border)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading dashboard...</p>}

      {!loading && tab === "listings" && (
        <div className="space-y-4">
          {listings.length === 0 && <p className="text-sm text-[var(--muted)]">No listings yet.</p>}
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <img
                  src={listing.image_url || "https://picsum.photos/seed/fallback/120/120"}
                  alt={listing.title}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{listing.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {listing.view_count}
                    </span>
                    <span className="text-xs text-[var(--muted)]">Rs. {listing.price}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    listing.is_available ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {listing.is_available ? "Active" : "Unavailable"}
                </span>
                {editingId === listing.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceDraft}
                      onChange={(event) => setPriceDraft(event.target.value)}
                      className="w-24 rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                    />
                    <button
                      onClick={() => savePrice(listing.id)}
                      className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditPrice(listing)}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                  >
                    Edit price
                  </button>
                )}
                {listing.is_available === 1 && (
                  <button
                    onClick={() => removeListing(listing.id)}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                  >
                    Mark unavailable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "transactions" && (
        <div className="space-y-4">
          {transactions.length === 0 && <p className="text-sm text-[var(--muted)]">No transactions yet.</p>}
          {transactions.map((transaction) => {
            const isBuyer = transaction.buyer_id === user?.id;
            const otherName = isBuyer ? transaction.seller_name : transaction.buyer_name;
            return (
              <div
                key={transaction.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{transaction.listing_title}</p>
                  <p className="text-xs text-[var(--muted)]">With {otherName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      transaction.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800"
                        : transaction.status === "CANCELLED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {transaction.status}
                  </span>
                  {transaction.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => markComplete(transaction.id)}
                        className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-white"
                      >
                        Mark complete
                      </button>
                      <button
                        onClick={() => cancelTransaction(transaction.id)}
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && tab === "wishlist" && (
        <div className="space-y-4">
          {wishlistLoading && <p className="text-sm text-[var(--muted)]">Loading wishlist...</p>}
          {!wishlistLoading && wishlist.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Your wishlist is empty.</p>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                wishlisted
                onToggleWishlist={removeWishlistItem}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
