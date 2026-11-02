
"use client";

import { useState } from "react";
import { Plus, Save, Check } from "lucide-react";

export default function SessionExerciseCard({
  sessionId,
  exercise,
  trackingType,
  targetSets,
  initialSets = [],
}) {
  const defaultSetCount = Math.max(targetSets || 1, 1);

  function createSet(number) {
    const saved = initialSets.find(
      (item) => item.setNumber === number
    );

    return {
      setNumber: number,
      reps: saved?.reps ?? "",
      weight: saved?.weight?.toString() ?? "",
      durationSeconds: saved?.durationSeconds ?? "",
      distance: saved?.distance?.toString() ?? "",
      isCompleted: saved?.isCompleted ?? false,
    };
  }

  const [sets, setSets] = useState(() => {
    const count = Math.max(
      defaultSetCount,
      ...initialSets.map((item) => item.setNumber),
      0
    );

    return Array.from(
      { length: count },
      (_, index) => createSet(index + 1)
    );
  });

  const [savingSet, setSavingSet] = useState(null);
  const [message, setMessage] = useState("");

  function updateSet(setNumber, field, value) {
    setSets((current) =>
      current.map((set) =>
        set.setNumber === setNumber
          ? { ...set, [field]: value }
          : set
      )
    );
  }

  function addSet() {
    setSets((current) => [
      ...current,
      createSet(current.length + 1),
    ]);
  }

  async function saveSet(set) {
    setSavingSet(set.setNumber);
    setMessage("");

    const numberOrNull = (value) =>
      value === "" ? null : Number(value);

    const payload = {
      sessionExerciseId: exercise.id,
      setNumber: set.setNumber,
      reps:
        trackingType === "REPS_WEIGHT" ||
        trackingType === "REPS_ONLY"
          ? numberOrNull(set.reps)
          : null,
      weight:
        trackingType === "REPS_WEIGHT"
          ? numberOrNull(set.weight)
          : null,
      durationSeconds:
        trackingType === "DURATION"
          ? numberOrNull(set.durationSeconds)
          : null,
      distance:
        trackingType === "DISTANCE"
          ? numberOrNull(set.distance)
          : null,
      isCompleted: set.isCompleted,
    };

    try {
      const response = await fetch(
        `/api/workout-sessions/${sessionId}/sets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Could not save set.");
        return;
      }

      setMessage(`Set ${set.setNumber} saved successfully.`);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSavingSet(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5">
        <p className="text-xs font-medium text-muted-foreground">
          {trackingType.replaceAll("_", " ")}
        </p>

        <h3 className="mt-1 text-lg font-semibold">
          {exercise.exerciseName}
        </h3>
      </div>

      <div className="space-y-4">
        {sets.map((set) => (
          <div
            key={set.setNumber}
            className="rounded-xl bg-muted p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">
                Set {set.setNumber}
              </p>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={set.isCompleted}
                  onChange={(event) =>
                    updateSet(
                      set.setNumber,
                      "isCompleted",
                      event.target.checked
                    )
                  }
                  className="size-4 accent-primary"
                />
                Completed
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(trackingType === "REPS_WEIGHT" ||
                trackingType === "REPS_ONLY") && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Reps
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={set.reps}
                    onChange={(event) =>
                      updateSet(
                        set.setNumber,
                        "reps",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 12"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}

              {trackingType === "REPS_WEIGHT" && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={set.weight}
                    onChange={(event) =>
                      updateSet(
                        set.setNumber,
                        "weight",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 10"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}

              {trackingType === "DURATION" && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={set.durationSeconds}
                    onChange={(event) =>
                      updateSet(
                        set.setNumber,
                        "durationSeconds",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 60"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}

              {trackingType === "DISTANCE" && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={set.distance}
                    onChange={(event) =>
                      updateSet(
                        set.setNumber,
                        "distance",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 2.5"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => saveSet(set)}
              disabled={savingSet !== null}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {savingSet === set.setNumber ? (
                "Saving..."
              ) : (
                <>
                  <Save size={15} />
                  Save set
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80"
      >
        <Plus size={16} />
        Add another set
      </button>

      {message && (
        <p className="mt-4 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
