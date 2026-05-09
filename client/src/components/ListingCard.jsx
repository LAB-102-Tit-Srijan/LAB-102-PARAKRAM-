import { Link, useNavigate } from "react-router-dom";

import ConditionBadge from "./ConditionBadge";
import { useAuth } from "../store.jsx";

function ListingCard({ listing, wishlisted = false, onToggleWishlist }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const imageUrl = listing.image_url || "https://picsum.photos/seed/fallback/800/600";

  const handleWishlistClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!token) {
      navigate("/login");
      return;
    }
    if (onToggleWishlist) {
      onToggleWishlist(listing.id);
    }
  };

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-44 w-full overflow-hidden">
        <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        {onToggleWishlist && (
          <button
            type="button"
            onClick={handleWishlistClick}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 ${wishlisted ? "text-rose-500" : "text-[var(--muted)]"}`}
              fill={wishlisted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 21s-7-4.35-9.33-8.07C1.15 10.06 1.7 6.5 4.7 5.05 7 3.94 9.36 4.77 11 6.43c1.64-1.66 4-2.49 6.3-1.38 3 1.45 3.55 5.01 2.03 7.88C19 16.65 12 21 12 21z" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold">{listing.title}</h3>
          <ConditionBadge value={listing.condition} />
        </div>
        <p className="text-sm text-[var(--muted)]">{listing.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              {listing.category} - {listing.listing_type}
            </p>
            <p className="text-lg font-semibold text-[var(--ink)]">Rs. {listing.price}</p>
          </div>
          <div className="text-xs text-[var(--muted)]">by {listing.seller_name}</div>
        </div>
      </div>
    </Link>
  );
}

export default ListingCard;
