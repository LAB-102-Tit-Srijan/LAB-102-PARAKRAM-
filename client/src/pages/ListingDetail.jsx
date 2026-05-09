import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../api";
import ConditionBadge from "../components/ConditionBadge";
import { useAuth } from "../store.jsx";

function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interestStatus, setInterestStatus] = useState("");
  const [interestSubmitted, setInterestSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    setInterestStatus("");
    setInterestSubmitted(false);
    const fetchListing = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/listings/${id}`);
        if (active) {
          setListing(response.data);
        }
      } catch (err) {
        if (active) {
          setError("Listing not found");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchListing();
    return () => {
      active = false;
    };
  }, [id]);

  const handleMessageSeller = () => {
    if (!listing) {
      return;
    }
    if (!token) {
      navigate("/login");
      return;
    }
    navigate(`/messages/chat?userId=${listing.seller_id}&listingId=${listing.id}`);
  };

  const handleExpressInterest = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      await api.post("/transactions", { listing_id: listing.id });
      setInterestStatus("Interest submitted. Check your dashboard for updates.");
      setInterestSubmitted(true);
    } catch (err) {
      setInterestStatus(err.response?.data?.message || "Unable to submit interest");
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading listing...</p>;
  }

  if (!listing) {
    return <p className="text-sm text-rose-600">{error || "Listing not available"}</p>;
  }

  const isOwner = user?.id === listing.seller_id;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
          <img
            src={listing.image_url || "https://picsum.photos/seed/fallback/900/700"}
            alt={listing.title}
            className="h-96 w-full object-cover"
          />
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{listing.title}</h1>
            <ConditionBadge value={listing.condition} />
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">{listing.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{listing.category}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{listing.listing_type}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              Views: {listing.view_count}
            </span>
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Price</p>
          <p className="mt-2 text-3xl font-semibold">Rs. {listing.price}</p>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">AI suggested price</p>
            <p className="mt-1 text-lg font-semibold">Rs. {listing.ai_suggested_price || "-"}</p>
          </div>
          {isOwner ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--muted)]">
              This is your listing.
            </div>
          ) : (
            <>
              <button
                onClick={handleMessageSeller}
                className="mt-6 w-full rounded-full border border-[var(--border)] px-4 py-3 text-sm font-semibold"
              >
                Message seller
              </button>
              <button
                onClick={handleExpressInterest}
                disabled={interestSubmitted}
                className="mt-3 w-full rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {interestSubmitted ? "Interest submitted" : "Express interest"}
              </button>
            </>
          )}
          {interestStatus && <p className="mt-3 text-sm text-[var(--muted)]">{interestStatus}</p>}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Seller</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-base font-semibold">{listing.seller_name}</p>
              <p className="text-sm text-[var(--muted)]">Rating 4.5</p>
            </div>
            <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
              Verified student
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default ListingDetail;
