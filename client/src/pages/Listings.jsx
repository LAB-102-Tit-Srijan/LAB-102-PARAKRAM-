import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../api";
import ListingCard from "../components/ListingCard";
import { useAuth } from "../store.jsx";

const categoryOptions = ["BOOKS", "GADGETS", "NOTES", "STATIONERY", "OTHER"];
const conditionOptions = ["LIKE_NEW", "GOOD", "FAIR", "POOR"];
const listingTypes = ["SELL", "RENT", "EXCHANGE"];

function Listings() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [wishlistedIds, setWishlistedIds] = useState(() => new Set());

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.get("category") ? [searchParams.get("category")] : []
  );
  const [selectedConditions, setSelectedConditions] = useState(
    searchParams.get("condition") ? [searchParams.get("condition")] : []
  );
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");

  const limit = 12;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategories.length) {
      params.set("category", selectedCategories.join(","));
    }
    if (selectedConditions.length) {
      params.set("condition", selectedConditions.join(","));
    }
    if (selectedType) {
      params.set("type", selectedType);
    }
    if (searchTerm) {
      params.set("search", searchTerm);
    }
    if (minPrice) {
      params.set("min_price", minPrice);
    }
    if (maxPrice) {
      params.set("max_price", maxPrice);
    }
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  }, [selectedCategories, selectedConditions, selectedType, searchTerm, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    let active = true;

    const fetchListings = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/listings?${queryString}`);
        if (active) {
          setListings(response.data.items || []);
          setTotal(response.data.total || 0);
        }
      } catch (error) {
        if (active) {
          setListings([]);
          setTotal(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchListings();
    return () => {
      active = false;
    };
  }, [queryString]);

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

  const toggleSelection = (value, current, setState) => {
    if (current.includes(value)) {
      setState(current.filter((item) => item !== value));
    } else {
      setState([...current, value]);
    }
    setPage(1);
  };

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-6 rounded-3xl border border-[var(--border)] bg-white p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Search</h2>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
            placeholder="Search listings"
          />
          <button
            onClick={() => {
              setSearchTerm(searchInput);
              setPage(1);
            }}
            className="mt-3 w-full rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
          >
            Apply search
          </button>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Category</h2>
          <div className="mt-3 space-y-2">
            {categoryOptions.map((category) => (
              <label key={category} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => toggleSelection(category, selectedCategories, setSelectedCategories)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Listing type</h2>
          <div className="mt-3 space-y-2">
            {listingTypes.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="listingType"
                  checked={selectedType === type}
                  onChange={() => {
                    setSelectedType(type);
                    setPage(1);
                  }}
                />
                {type}
              </label>
            ))}
            <button
              onClick={() => {
                setSelectedType("");
                setPage(1);
              }}
              className="text-xs font-semibold text-[var(--muted)]"
            >
              Clear
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Condition</h2>
          <div className="mt-3 space-y-2">
            {conditionOptions.map((condition) => (
              <label key={condition} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedConditions.includes(condition)}
                  onChange={() => toggleSelection(condition, selectedConditions, setSelectedConditions)}
                />
                {condition.replace("_", " ")}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Price range</h2>
          <div className="mt-3 grid gap-3">
            <input
              type="number"
              value={minPrice}
              onChange={(event) => {
                setMinPrice(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-2 text-sm"
              placeholder="Min"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(event) => {
                setMaxPrice(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-2 text-sm"
              placeholder="Max"
            />
          </div>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Listings</h1>
            <p className="text-sm text-[var(--muted)]">Browse active campus listings.</p>
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price low to high</option>
            <option value="price_desc">Price high to low</option>
          </select>
        </div>

        {loading && <p className="text-sm text-[var(--muted)]">Loading listings...</p>}
        {!loading && listings.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No listings match these filters.</p>
        )}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              wishlisted={wishlistedIds.has(listing.id)}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
          >
            Previous
          </button>
          <p className="text-sm text-[var(--muted)]">
            Page {page} of {totalPages}
          </p>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

export default Listings;
