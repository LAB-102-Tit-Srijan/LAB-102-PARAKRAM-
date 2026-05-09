import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../store.jsx";
import ListingCard from "../components/ListingCard";

const categories = [
  { key: "BOOKS", label: "Books", blurb: "Textbooks and readers" },
  { key: "GADGETS", label: "Gadgets", blurb: "Tech and devices" },
  { key: "NOTES", label: "Notes", blurb: "Course notes" },
  { key: "STATIONERY", label: "Stationery", blurb: "Daily essentials" },
  { key: "OTHER", label: "Other", blurb: "Everything else" }
];

function Home() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistedIds, setWishlistedIds] = useState(() => new Set());

  useEffect(() => {
    let active = true;

    const loadRecommendations = async () => {
      setLoading(true);
      try {
        if (token) {
          const response = await api.get("/listings/recommendations");
          if (active) {
            setRecommended(response.data || []);
          }
        } else {
          const response = await api.get("/listings", {
            params: { limit: 6, sort: "newest" }
          });
          if (active) {
            setRecommended(response.data.items || []);
          }
        }
      } catch (error) {
        if (active) {
          setRecommended([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRecommendations();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setWishlistedIds(new Set());
      return;
    }

    let active = true;
    const loadWishlistIds = async () => {
      try {
        const response = await api.get("/wishlist/ids");
        if (active) {
          setWishlistedIds(new Set(response.data || []));
        }
      } catch (error) {
        if (active) {
          setWishlistedIds(new Set());
        }
      }
    };

    loadWishlistIds();
    return () => {
      active = false;
    };
  }, [token]);

  const toggleWishlist = async (listingId) => {
    if (!token) {
      return;
    }

    const wasWishlisted = wishlistedIds.has(listingId);
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (wasWishlisted) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });

    try {
      if (wasWishlisted) {
        await api.delete(`/wishlist/${listingId}`);
      } else {
        await api.post("/wishlist", { listing_id: listingId });
      }
    } catch (error) {
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });
    }
  };

  const onSearchSubmit = (event) => {
    event.preventDefault();
    navigate(`/listings?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="space-y-14">
      <section className="grid gap-10 rounded-3xl border border-[var(--border)] bg-white/80 p-8 shadow-sm md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Campus Loop</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Buy, sell, and rent without leaving campus.
          </h1>
          <p className="text-base text-[var(--muted)]">
            A verified student marketplace to keep your essentials moving. Find deals, chat fast, and meet
            on campus.
          </p>
          <form onSubmit={onSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm"
              placeholder="Search for books, gadgets, notes"
            />
            <button className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white">
              Search listings
            </button>
          </form>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6">
          <h2 className="text-lg font-semibold">Popular categories</h2>
          <div className="mt-6 grid gap-4">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => navigate(`/listings?category=${category.key}`)}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left transition hover:-translate-y-0.5"
              >
                <div>
                  <p className="text-sm font-semibold">{category.label}</p>
                  <p className="text-xs text-[var(--muted)]">{category.blurb}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--muted)]">View</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Recommended for you</h2>
            <p className="text-sm text-[var(--muted)]">Fresh picks based on campus activity.</p>
          </div>
          <button
            onClick={() => navigate("/listings")}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
          >
            Browse all
          </button>
        </div>
        {loading && <p className="text-sm text-[var(--muted)]">Loading recommendations...</p>}
        {!loading && recommended.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No recommendations yet. Check back soon.</p>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recommended.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              wishlisted={wishlistedIds.has(listing.id)}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-[var(--border)] bg-white p-8 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">How it works</p>
          <h2 className="mt-3 text-2xl font-semibold">List, chat, meet</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Campus Loop keeps it simple: create a listing, message instantly, and close the deal in person.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <p className="text-sm font-semibold">1. List your item</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Use the quick wizard and an AI price range.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <p className="text-sm font-semibold">2. Chat with buyers</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Messages update every few seconds.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 md:col-start-2">
          <p className="text-sm font-semibold">3. Meet on campus</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Confirm and mark the transaction done.</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
