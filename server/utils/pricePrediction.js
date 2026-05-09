const BASE_PRICES = {
  BOOKS: { min: 50, max: 800 },
  GADGETS: { min: 500, max: 25000 },
  NOTES: { min: 20, max: 200 },
  STATIONERY: { min: 10, max: 300 },
  OTHER: { min: 50, max: 2000 }
};

const CONDITION_MULTIPLIER = {
  LIKE_NEW: 0.8,
  GOOD: 0.6,
  FAIR: 0.4,
  POOR: 0.2
};

function predictPrice(category, condition, db) {
  const base = BASE_PRICES[category] || BASE_PRICES.OTHER;
  const multiplier = CONDITION_MULTIPLIER[condition] || 0.5;

  const count = db
    .prepare("SELECT COUNT(*) as c FROM listings WHERE category = ? AND is_available = 1")
    .get(category).c;

  let demandFactor = 1.0;
  if (count > 20) {
    demandFactor = 0.9;
  }
  if (count < 5) {
    demandFactor = 1.15;
  }

  const suggestedMin = Math.round(base.min * multiplier * demandFactor);
  const suggestedMax = Math.round(base.max * multiplier * demandFactor);

  const label = count < 5 ? "High Demand" : count > 20 ? "Competitive Market" : "Fair Market";

  return { suggestedMin, suggestedMax, label };
}

module.exports = { predictPrice };
