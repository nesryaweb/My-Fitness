
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

const initialForm = {
  name: "",
  description: "",
  instructions: "",
  category: "",
  primaryMuscle: "",
  secondaryMuscles: "",
  equipment: "",
  trackingType: "REPS_WEIGHT",
};

export default function AddExerciseForm() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setSuccess("");

    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          secondaryMuscles: form.secondaryMuscles
            .split(",")
            .map((muscle) => muscle.trim())
            .filter(Boolean),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Could not save the exercise.");
        return;
      }

      setForm(initialForm);
      setIsOpen(false);
      setSuccess("Exercise added successfully.");

      // Reload the server-rendered exercise list.
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
          setSuccess("");
        }}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {isOpen ? <X size={18} /> : <Plus size={18} />}
        {isOpen ? "Close form" : "Add Exercise"}
      </button>

      {success && (
        <p className="mt-4 text-sm text-green-400">{success}</p>
      )}

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Add a new exercise
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an exercise to your personal library.
            </p>
          </div>

          {error && (
            <p className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Exercise name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g. Push-ups"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select category</option>
                <option value="Strength">Strength</option>
                <option value="Cardio">Cardio</option>
                <option value="Mobility">Mobility</option>
                <option value="Flexibility">Flexibility</option>
                <option value="Calisthenics">Calisthenics</option>
                <option value="Balance">Balance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Primary muscle
              </label>
              <input
                name="primaryMuscle"
                value={form.primaryMuscle}
                onChange={handleChange}
                placeholder="e.g. Chest"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Secondary muscles
              </label>
              <input
                name="secondaryMuscles"
                value={form.secondaryMuscles}
                onChange={handleChange}
                placeholder="e.g. Triceps, Shoulders"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple muscles with commas.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Equipment
              </label>
              <input
                name="equipment"
                value={form.equipment}
                onChange={handleChange}
                placeholder="e.g. Dumbbells, None"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Tracking type *
              </label>
              <select
                name="trackingType"
                value={form.trackingType}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="REPS_WEIGHT">Reps & Weight</option>
                <option value="REPS_ONLY">Reps Only</option>
                <option value="DURATION">Duration</option>
                <option value="DISTANCE">Distance</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={2000}
                placeholder="A short description of the exercise..."
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Instructions
              </label>
              <textarea
                name="instructions"
                value={form.instructions}
                onChange={handleChange}
                rows={4}
                maxLength={5000}
                placeholder="How should this exercise be performed?"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Exercise"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
