function PriceSuggestBox({ suggestion }) {
  if (!suggestion) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">AI Price Suggestion</p>
      <p className="mt-2 text-lg font-semibold">
        Rs. {suggestion.suggestedMin} - Rs. {suggestion.suggestedMax}
      </p>
      <p className="text-sm text-[var(--muted)]">{suggestion.label}</p>
    </div>
  );
}

export default PriceSuggestBox;
