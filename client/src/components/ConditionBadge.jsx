const styles = {
  LIKE_NEW: "bg-emerald-100 text-emerald-800",
  GOOD: "bg-sky-100 text-sky-800",
  FAIR: "bg-amber-100 text-amber-800",
  POOR: "bg-rose-100 text-rose-800"
};

function ConditionBadge({ value }) {
  const className = styles[value] || "bg-slate-100 text-slate-800";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {value?.replace("_", " ") || "UNKNOWN"}
    </span>
  );
}

export default ConditionBadge;
