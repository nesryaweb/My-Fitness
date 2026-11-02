
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export default function EditWorkoutForm({ workout, exercises }) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(workout.name);
  const [description, setDescription] = useState(workout.description || "");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [selectedExercises, setSelectedExercises] = useState(
    workout.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      targetSets: item.targetSets?.toString() || "",
      targetRepsMin: item.targetRepsMin?.toString() || "",
      targetRepsMax: item.targetRepsMax?.toString() || "",
      targetWeight: item.targetWeight?.toString() || "",
      targetDuration: item.targetDuration?.toString() || "",
      restSeconds: item.restSeconds?.toString() || "",
      notes: item.notes || "",
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const availableExercises = exercises.filter(
    (exercise) =>
      !selectedExercises.some(
        (selected) => selected.exerciseId === exercise.id
      )
  );

  function addExercise() {
    if (!selectedExerciseId) return;

    setSelectedExercises((current) => [
      ...current,
      {
        exerciseId: selectedExerciseId,
        targetSets: "3",
        targetRepsMin: "10",
        targetRepsMax: "12",
        targetWeight: "",
        targetDuration: "",
        restSeconds: "60",
        notes: "",
      },
    ]);

    setSelectedExerciseId("");
  }

  function updateExercise(index, field, value) {
    setSelectedExercises((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function removeExercise(index) {
    setSelectedExercises((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function toOptionalNumber(value) {
    return value === "" ? undefined : Number(value);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (selectedExercises.length === 0) {
      setError("Please add at least one exercise.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        id: workout.id,
        name,
        description,
        exercises: selectedExercises.map((item) => ({
          exerciseId: item.exerciseId,
          targetSets: toOptionalNumber(item.targetSets),
          targetRepsMin: toOptionalNumber(item.targetRepsMin),
          targetRepsMax: toOptionalNumber(item.targetRepsMax),
          targetWeight: toOptionalNumber(item.targetWeight),
          targetDuration: toOptionalNumber(item.targetDuration),
          restSeconds: toOptionalNumber(item.restSeconds),
          notes: item.notes,
        })),
      };

      const response = await fetch("/api/workouts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Could not update workout.");
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch {
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
        className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground transition hover:opacity-80"
      >
        {isOpen ? <X size={16} /> : <Pencil size={16} />}
        {isOpen ? "Close" : "Edit Workout"}
      </button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-6 border-t border-border pt-5"
        >
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Workout name *
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={100}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={1000}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground"
            />
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-foreground">
              Exercises
            </h4>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedExerciseId}
                onChange={(event) =>
                  setSelectedExerciseId(event.target.value)
                }
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground"
              >
                <option value="">Choose an exercise</option>
                {availableExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addExercise}
                disabled={!selectedExerciseId}
                className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground disabled:opacity-40"
              >
                <Plus size={17} />
                Add Exercise
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {selectedExercises.map((item, index) => {
              const exercise = exercises.find(
                (entry) => entry.id === item.exerciseId
              );

              return (
                <div
                  key={item.exerciseId}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-primary">
                        EXERCISE {index + 1}
                      </p>
                      <h5 className="font-semibold text-foreground">
                        {exercise?.name || "Exercise"}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        {exercise?.trackingType?.replaceAll("_", " ")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeExercise(index)}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      aria-label="Remove exercise"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["Sets", "targetSets", "1"],
                      ["Minimum reps", "targetRepsMin", "1"],
                      ["Maximum reps", "targetRepsMax", "1"],
                      ["Target weight (kg)", "targetWeight", "0.25"],
                      ["Duration (seconds)", "targetDuration", "1"],
                      ["Rest (seconds)", "restSeconds", "0"],
                    ].map(([label, field, min]) => (
                      <div key={field}>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          {label}
                        </label>
                        <input
                          type="number"
                          min={min}
                          step={field === "targetWeight" ? "0.25" : "1"}
                          value={item[field]}
                          onChange={(event) =>
                            updateExercise(index, field, event.target.value)
                          }
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Exercise notes
                    </label>
                    <textarea
                      value={item.notes}
                      onChange={(event) =>
                        updateExercise(index, "notes", event.target.value)
                      }
                      rows={2}
                      maxLength={500}
                      className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end border-t border-border pt-5">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
