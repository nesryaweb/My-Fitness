
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Scale,
  Ruler,
  Loader2,
  CalendarDays,
  RefreshCw,
  Pencil,
  X,
  Save,
  Trash2,
  TrendingUp,
} from "lucide-react";
import AddMeasurementForm from "./add-measurement-form";

const metricDetails = {
  WEIGHT: { label: "Weight", unit: "kg", icon: Scale },
  HEIGHT: { label: "Height", unit: "cm", icon: Ruler },
  WAIST: { label: "Waist", unit: "cm", icon: Activity },
  HIPS: { label: "Hips", unit: "cm", icon: Activity },
  CHEST: { label: "Chest", unit: "cm", icon: Activity },
  ARM: { label: "Arm", unit: "cm", icon: Activity },
  THIGH: { label: "Thigh", unit: "cm", icon: Activity },
  BODY_FAT: { label: "Body fat", unit: "%", icon: Activity },
};

function formatDate(date) {
  return new Date(date).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateInput(date) {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatValue(value) {
  return Number(value).toLocaleString("en", {
    maximumFractionDigits: 2,
  });
}
function buildChartPoints(measurements) {
  const width = 640;
  const height = 240;
  const padding = { top: 25, right: 35, bottom: 45, left: 55 };

  const values = measurements.map((item) => Number(item.value));

  let min = Math.min(...values);
  let max = Math.max(...values);

  // Give the chart some vertical space when all values are equal.
  if (min === max) {
    min = min * 0.95;
    max = max * 1.05;
  }

  const range = max - min;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = measurements.map((item, index) => {
    const x =
      measurements.length === 1
        ? width / 2
        : padding.left +
          (index / (measurements.length - 1)) * chartWidth;

    const y =
      padding.top +
      ((max - Number(item.value)) / range) * chartHeight;

    return {
      x,
      y,
      value: Number(item.value),
      date: item.recordedAt,
    };
  });

  return {
    width,
    height,
    padding,
    points,
    min,
    max,
    chartWidth,
    chartHeight,
  };
}
export default function MeasurementHistory() {
  const [measurements, setMeasurements] = useState([]);
  const [selectedChartType, setSelectedChartType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const [deletingId, setDeletingId] = useState(null);
const [deleteError, setDeleteError] = useState("");
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  async function loadMeasurements() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/body-measurements", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not load measurements.");
      }

      setMeasurements(result.measurements || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeasurements();
  }, []);

  function handleSaved(newMeasurement) {
    setMeasurements((current) =>
      [newMeasurement, ...current].sort(
        (a, b) =>
          new Date(b.recordedAt) - new Date(a.recordedAt)
      )
    );
  }

  function openEdit(measurement) {
    setEditingMeasurement(measurement);
    setEditValue(String(measurement.value));
    setEditDate(formatDateInput(measurement.recordedAt));
    setEditNotes(measurement.notes || "");
    setEditError("");
  }

  function closeEdit() {
    if (savingEdit) return;

    setEditingMeasurement(null);
    setEditError("");
  }

  async function handleEditSubmit(event) {
    event.preventDefault();

    if (!editingMeasurement) return;

    const value = Number(editValue);

    if (!Number.isFinite(value) || value <= 0) {
      setEditError("Please enter a valid positive measurement.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const response = await fetch("/api/body-measurements", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingMeasurement.id,
          type: editingMeasurement.type,
          value,
          recordedAt: editDate,
          notes: editNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not update measurement.");
      }

      setMeasurements((current) =>
        current
          .map((item) =>
            item.id === result.measurement.id
              ? result.measurement
              : item
          )
          .sort(
            (a, b) =>
              new Date(b.recordedAt) - new Date(a.recordedAt)
          )
      );

      setEditingMeasurement(null);
    } catch (err) {
      setEditError(err.message || "Something went wrong.");
    } finally {
      setSavingEdit(false);
    }
  }
async function handleDelete(measurement) {
  const metricName =
    metricDetails[measurement.type]?.label || measurement.type;

  const confirmed = window.confirm(
    `Are you sure you want to delete this ${metricName} measurement? This cannot be undone.`
  );

  if (!confirmed) return;

  setDeletingId(measurement.id);
  setDeleteError("");

  try {
    const response = await fetch("/api/body-measurements", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: measurement.id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Could not delete measurement.");
    }

    setMeasurements((current) =>
      current.filter((item) => item.id !== measurement.id)
    );
  } catch (err) {
    setDeleteError(err.message || "Something went wrong.");
  } finally {
    setDeletingId(null);
  }
}
  const latestMeasurements = useMemo(() => {
    const latest = {};

    for (const measurement of [...measurements].sort(
      (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)
    )) {
      if (!latest[measurement.type]) {
        latest[measurement.type] = measurement;
      }
    }

    return Object.values(latest);
  }, [measurements]);

  const sortedMeasurements = useMemo(
    () =>
      [...measurements].sort(
        (a, b) =>
          new Date(b.recordedAt) - new Date(a.recordedAt)
      ),
    [measurements]
  );
const availableChartTypes = useMemo(() => {
  const counts = {};

  for (const measurement of measurements) {
    counts[measurement.type] = (counts[measurement.type] || 0) + 1;
  }

  return Object.keys(counts).filter(
    (type) => counts[type] >= 2
  );
}, [measurements]);

const activeChartType =
  availableChartTypes.includes(selectedChartType)
    ? selectedChartType
    : availableChartTypes[0] || null;

const chartMeasurements = useMemo(() => {
  if (!activeChartType) return [];

  return measurements
    .filter((item) => item.type === activeChartType)
    .sort(
      (a, b) =>
        new Date(a.recordedAt) - new Date(b.recordedAt)
    )
    .slice(-12);
}, [measurements, activeChartType]);

const chart = useMemo(
  () => buildChartPoints(chartMeasurements),
  [chartMeasurements]
);
  return (
    <div className="space-y-8">
      {/* Latest measurements */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Your measurements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your most recently recorded values.
            </p>
          </div>

          <AddMeasurementForm onSaved={handleSaved} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="ml-3 text-sm text-muted-foreground">
              Loading measurements...
            </span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={loadMeasurements}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        ) : latestMeasurements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Activity size={23} />
            </div>

            <h3 className="mt-4 font-semibold">
              No measurements yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Start by recording your weight, height, or another body
              measurement. Your progress will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {latestMeasurements.map((measurement) => {
              const metric = metricDetails[measurement.type];
              const Icon = metric?.icon || Activity;

              return (
                <div
                  key={measurement.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground">
                    {metric?.label || measurement.type}
                  </p>

                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {formatValue(measurement.value)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">
                      {measurement.unit}
                    </span>
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(measurement.recordedAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Full measurement history */}
      {!loading && !error && measurements.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold">Measurement history</h2>
            
            <p className="mt-1 text-sm text-muted-foreground">
              All your recorded measurements, newest first.
            </p>
          </div>
{deleteError && (
  <p className="mb-3 text-sm text-destructive">
    {deleteError}
  </p>
)}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {sortedMeasurements.map((measurement, index) => {
              const metric = metricDetails[measurement.type];

              return (
                <div
                  key={measurement.id}
                  className={`flex items-start gap-3 p-4 sm:items-center ${
                    index !== sortedMeasurements.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Activity size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {metric?.label || measurement.type}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} />
                        {formatDate(measurement.recordedAt)}
                      </span>

                      {measurement.notes && (
                        <span className="truncate">
                          · {measurement.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-sm font-bold tabular-nums">
                      {formatValue(measurement.value)}{" "}
                      <span className="font-normal text-muted-foreground">
                        {measurement.unit}
                      </span>
                    </p>

                    <div className="flex items-center gap-1">
  <button
    type="button"
    onClick={() => openEdit(measurement)}
    aria-label={`Edit ${metric?.label || measurement.type}`}
    title="Edit measurement"
    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
  >
    <Pencil size={16} />
  </button>

  <button
    type="button"
    onClick={() => handleDelete(measurement)}
    disabled={deletingId === measurement.id}
    aria-label={`Delete ${metric?.label || measurement.type}`}
    title="Delete measurement"
    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
  >
    {deletingId === measurement.id ? (
      <Loader2 size={16} className="animate-spin" />
    ) : (
      <Trash2 size={16} />
    )}
  </button>
</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Edit measurement modal */}
      {editingMeasurement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEdit();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Edit measurement</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update your recorded value.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                aria-label="Close edit form"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Measurement type
                </label>
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm">
                  {metricDetails[editingMeasurement.type]?.label ||
                    editingMeasurement.type}
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-measurement-value"
                  className="mb-2 block text-sm font-medium"
                >
                  Value ({editingMeasurement.unit})
                </label>
                <input
                  id="edit-measurement-value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-measurement-date"
                  className="mb-2 block text-sm font-medium"
                >
                  Date recorded
                </label>
                <input
                  id="edit-measurement-date"
                  type="date"
                  required
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-measurement-notes"
                  className="mb-2 block text-sm font-medium"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="edit-measurement-notes"
                  rows={3}
                  maxLength={1000}
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  placeholder="Add any notes..."
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={savingEdit}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}      {/* Measurement progress chart */}
      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-bold">
              Measurement progress
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            See how your measurements change over time.
          </p>
        </div>

        {availableChartTypes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <TrendingUp
              size={26}
              className="mx-auto text-muted-foreground"
            />

            <h3 className="mt-3 font-semibold">
              Not enough data for a chart yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Record at least two measurements of the same type to see
              your progress here.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap gap-2">
              {availableChartTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedChartType(type)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeChartType === type
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {metricDetails[type]?.label || type}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {metricDetails[activeChartType]?.label}
              </p>

              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatValue(
                  chartMeasurements[chartMeasurements.length - 1].value
                )}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  {metricDetails[activeChartType]?.unit}
                </span>
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Latest recorded value
              </p>
            </div>

            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="h-auto w-full"
                role="img"
                aria-label={`${metricDetails[activeChartType]?.label} measurements over time`}
              >
                {/* Horizontal guide lines */}
                {[0, 1, 2, 3].map((index) => {
                  const y =
                    chart.padding.top +
                    (index / 3) * chart.chartHeight;

                  const value =
                    chart.max - (index / 3) * (chart.max - chart.min);

                  return (
                    <g key={index}>
                      <line
                        x1={chart.padding.left}
                        y1={y}
                        x2={chart.width - chart.padding.right}
                        y2={y}
                        stroke="currentColor"
                        opacity="0.12"
                        strokeDasharray="4 5"
                      />

                      <text
                        x={chart.padding.left - 10}
                        y={y + 4}
                        textAnchor="end"
                        fill="currentColor"
                        opacity="0.6"
                        fontSize="12"
                      >
                        {formatValue(value)}
                      </text>
                    </g>
                  );
                })}

                {/* Measurement line */}
                <polyline
                  points={chart.points
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Measurement points */}
                {chart.points.map((point, index) => (
                  <g key={index}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="var(--primary)"
                      stroke="var(--card)"
                      strokeWidth="2"
                    />

                    <title>
                      {formatDate(point.date)}: {formatValue(point.value)}
                    </title>
                  </g>
                ))}

                {/* Date labels */}
                {[0, Math.floor((chart.points.length - 1) / 2), chart.points.length - 1]
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .map((index) => (
                    <text
                      key={index}
                      x={chart.points[index].x}
                      y={chart.height - 10}
                      textAnchor="middle"
                      fill="currentColor"
                      opacity="0.65"
                      fontSize="12"
                    >
                      {new Date(
                        chart.points[index].date
                      ).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </text>
                  ))}
              </svg>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Showing the latest {chartMeasurements.length} recorded values
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
