
"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const metricOptions = [
  { value: "WEIGHT", label: "Weight", unit: "kg" },
  { value: "HEIGHT", label: "Height", unit: "cm" },
  { value: "WAIST", label: "Waist", unit: "cm" },
  { value: "HIPS", label: "Hips", unit: "cm" },
  { value: "CHEST", label: "Chest", unit: "cm" },
  { value: "ARM", label: "Arm", unit: "cm" },
  { value: "THIGH", label: "Thigh", unit: "cm" },
  { value: "BODY_FAT", label: "Body fat", unit: "%" },
];

function getToday() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
}

export default function AddMeasurementForm({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("WEIGHT");
  const [value, setValue] = useState("");
  const [recordedAt, setRecordedAt] = useState(getToday);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMetric = metricOptions.find(
    (metric) => metric.value === type
  );

  function resetForm() {
    setType("WEIGHT");
    setValue("");
    setRecordedAt(getToday());
    setNotes("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!value || Number(value) <= 0) {
      toast.error("Enter a valid measurement value.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/body-measurements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          value: Number(value),
          recordedAt: new Date(
            `${recordedAt}T12:00:00`
          ).toISOString(),
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not save measurement."
        );
      }

      toast.success("Measurement saved successfully.");

      resetForm();
      setOpen(false);
      onSaved?.(result.measurement);
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        <Plus size={17} />
        Add measurement
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Add measurement
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record a new body measurement.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Measurement
                </label>

                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {metricOptions.map((metric) => (
                    <option key={metric.value} value={metric.value}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Value
                </label>

                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="Enter value"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 pr-14 text-sm outline-none focus:border-primary"
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {selectedMetric.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Date recorded
                </label>

                <input
                  type="date"
                  required
                  max={getToday()}
                  value={recordedAt}
                  onChange={(event) => setRecordedAt(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </label>

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add any notes about this measurement..."
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save measurement"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
