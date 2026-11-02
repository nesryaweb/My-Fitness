
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";

export default function EditExerciseForm({ exercise }) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: exercise.name || "",
    description: exercise.description || "",
    instructions: exercise.instructions || "",
    category: exercise.category || "",
    primaryMuscle: exercise.primaryMuscle || "",
    secondaryMuscles: exercise.secondaryMuscles.join(", "),
    equipment: exercise.equipment || "",
    trackingType: exercise.trackingType,
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/exercises", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: exercise.id,
          ...form,
          secondaryMuscles: form.secondaryMuscles
            .split(",")
            .map((muscle) => muscle.trim())
            .filter(Boolean),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Could not update the exercise.");
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setError("");
        }}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        {isOpen ? <X size={16} /> : <Pencil size={16} />}
        {isOpen ? "Close" : "Edit"}
      </button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 border-t border-border pt-4"
        >
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Exercise name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Category
              </label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Primary muscle
              </label>
              <input
                name="primaryMuscle"
                value={form.primaryMuscle}
                onChange={handleChange}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Secondary muscles
              </label>
              <input
                name="secondaryMuscles"
                value={form.secondaryMuscles}
                onChange={handleChange}
                placeholder="Triceps, Shoulders"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Equipment
              </label>
              <input
                name="equipment"
                value={form.equipment}
                onChange={handleChange}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Tracking type *
            </label>
            <select
              name="trackingType"
              value={form.trackingType}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="REPS_WEIGHT">Reps & Weight</option>
              <option value="REPS_ONLY">Reps Only</option>
              <option value="DURATION">Duration</option>
              <option value="DISTANCE">Distance</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Instructions
            </label>
            <textarea
              name="instructions"
              value={form.instructions}
              onChange={handleChange}
              rows={4}
              maxLength={5000}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
