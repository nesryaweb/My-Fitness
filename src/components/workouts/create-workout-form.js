"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Minus } from "lucide-react";

export default function CreateWorkoutForm({ exercises }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const availableExercises = exercises.filter(
    (exercise) =>
      !selectedExercises.some(
        (selected) => selected.exerciseId === exercise.id,
      ),
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
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeExercise(index) {
    setSelectedExercises((current) => current.filter((_, i) => i !== index));
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Could not create the workout.");
        return;
      }

      setName("");
      setDescription("");
      setSelectedExercises([]);
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
        onClick={() => setIsOpen((current) => !current)}
        className="mb-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
       {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        {isOpen ? "Close Form" : "Create Workout"}
      </button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Create a workout
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Give your workout a name and add exercises from your library.
            </p>
          </div>

          {error && (
            <p className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mb-6 space-y-4">
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
                placeholder="e.g. Upper Body Workout"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
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
                maxLength={2000}
                placeholder="What is this workout for?"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="mb-3 font-semibold text-foreground">Exercises</h3>

            {exercises.length === 0 ? (
              <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                Your Exercise Library is empty. Add some exercises before
                creating a workout.
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedExerciseId}
                  onChange={(event) =>
                    setSelectedExerciseId(event.target.value)
                  }
                  className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
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
                  className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition hover:opacity-80 disabled:opacity-40"
                >
                  <Plus size={17} />
                  Add Exercise
                </button>
              </div>
            )}
          </div>

          {selectedExercises.length > 0 && (
            <div className="mt-6 space-y-4">
              {selectedExercises.map((item, index) => {
                const exercise = exercises.find(
                  (entry) => entry.id === item.exerciseId,
                );

                return (
                  <div
                    key={item.exerciseId}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-primary">
                          EXERCISE {index + 1}
                        </p>
                        <h4 className="font-semibold text-foreground">
                          {exercise?.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {exercise?.trackingType?.replaceAll("_", " ")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeExercise(index)}
                        className="rounded-lg p-2 text-destructive transition hover:bg-destructive/10"
                        aria-label={`Remove ${exercise?.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Sets
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.targetSets}
                          onChange={(event) =>
                            updateExercise(
                              index,
                              "targetSets",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Minimum reps
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.targetRepsMin}
                          onChange={(event) =>
                            updateExercise(
                              index,
                              "targetRepsMin",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Maximum reps
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.targetRepsMax}
                          onChange={(event) =>
                            updateExercise(
                              index,
                              "targetRepsMax",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Target weight (kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          value={item.targetWeight}
                          onChange={(event) =>
                            updateExercise(
                              index,
                              "targetWeight",
                              event.target.value,
                            )
                          }
                          placeholder="Optional"
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Duration (seconds)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.targetDuration}
                          onChange={(event) =>
                            updateExercise(
                              index,
                              "targetDuration",
                              event.target.value,
                            )
                          }
                          placeholder="Optional"
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          Rest (seconds)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.restSeconds}
                          onChange={(event) =>
                            updateExercise(
                              index,
                              "restSeconds",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                        />
                      </div>
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
                        placeholder="Optional notes..."
                        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-border pt-5">
            <button
              type="submit"
              disabled={isSaving || exercises.length === 0}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Save Workout"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
