import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import PriceSuggestBox from "../components/PriceSuggestBox";

const categories = ["BOOKS", "GADGETS", "NOTES", "STATIONERY", "OTHER"];
const listingTypes = ["SELL", "RENT", "EXCHANGE"];
const conditions = ["LIKE_NEW", "GOOD", "FAIR", "POOR"];

function CreateListing() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    category: "",
    listing_type: "",
    title: "",
    description: "",
    condition: "",
    image_url: "",
    price: ""
  });
  const [suggestion, setSuggestion] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return form.category && form.listing_type;
    }
    if (step === 2) {
      return form.title && form.condition;
    }
    return true;
  }, [step, form]);

  useEffect(() => {
    let active = true;

    const getSuggestion = async () => {
      if (!form.category || !form.condition) {
        setSuggestion(null);
        return;
      }
      try {
        const response = await api.post("/listings/price-predict", {
          category: form.category,
          condition: form.condition
        });
        if (active) {
          setSuggestion(response.data);
        }
      } catch (error) {
        if (active) {
          setSuggestion(null);
        }
      }
    };

    getSuggestion();
    return () => {
      active = false;
    };
  }, [form.category, form.condition]);

  useEffect(() => {
    if (suggestion && !form.price) {
      const avg = Math.round((suggestion.suggestedMin + suggestion.suggestedMax) / 2);
      setForm((prev) => ({ ...prev, price: String(avg) }));
    }
  }, [suggestion, form.price]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "image_url") {
      setImagePreview(value);
    }
  };

  const handleImageFile = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      setImagePreview("");
      setForm((prev) => ({ ...prev, image_url: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, image_url: result }));
        setImagePreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setStatus("");
    setLoading(true);

    try {
      await api.post("/listings", {
        ...form,
        price: Number(form.price)
      });
      navigate("/dashboard");
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to create listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Create listing</p>
        <h1 className="mt-2 text-2xl font-semibold">Step {step} of 3</h1>
      </div>

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
            <h2 className="text-lg font-semibold">Pick a category</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setForm((prev) => ({ ...prev, category }))}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    form.category === category
                      ? "border-[var(--ink)] bg-[var(--bg)]"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
            <h2 className="text-lg font-semibold">Listing type</h2>
            <div className="mt-4 grid gap-3">
              {listingTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((prev) => ({ ...prev, listing_type: type }))}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    form.listing_type === type
                      ? "border-[var(--ink)] bg-[var(--bg)]"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                  placeholder="Item title"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                  placeholder="Tell buyers more about the item"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Condition</label>
                <select
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                >
                  <option value="">Select</option>
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Image upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
                />
                <p className="mt-2 text-xs text-[var(--muted)]">Stored as base64 for MVP. Keep files small.</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Image URL (optional)</label>
                <input
                  name="image_url"
                  value={form.image_url}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                  placeholder="Paste a URL or base64 string"
                />
              </div>
              {imagePreview && (
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <img src={imagePreview} alt="Preview" className="h-48 w-full object-cover" />
                </div>
              )}
            </div>
          </div>
          <PriceSuggestBox suggestion={suggestion} />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
            <h2 className="text-lg font-semibold">Set your price</h2>
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={handleChange}
              className="mt-4 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
              placeholder="Price"
            />
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm">
              <p className="font-semibold">Review</p>
              <p className="mt-1 text-[var(--muted)]">{form.title || "Untitled"}</p>
              <p className="text-[var(--muted)]">{form.category} - {form.listing_type}</p>
            </div>
          </div>
          <PriceSuggestBox suggestion={suggestion} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-[var(--muted)]">{status}</div>
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((prev) => prev - 1)}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
            >
              Back
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => setStep((prev) => prev + 1)}
              disabled={!canGoNext}
              className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Submitting..." : "Publish listing"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateListing;
