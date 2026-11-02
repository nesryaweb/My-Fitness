
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, ArrowRight, X, Loader2 } from "lucide-react";

export default function StartWorkoutButton({ workoutId }) {
  const router = useRouter();

  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [existingSessionId, setExistingSessionId] = useState(null);
  const [showChoice, setShowChoice] = useState(false);

  async function startWorkout(replaceExisting = false) {
    setIsStarting(true);
    setError("");

    try {
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workoutId,
          replaceExisting,
        }),
      });

      const result = await response.json();

      // An unfinished session already exists.
      if (response.status === 409 && result.existingSessionId) {
        setExistingSessionId(result.existingSessionId);
        setShowChoice(true);
        return;
      }

      if (!response.ok) {
        setError(result.message || "Could not start workout.");
        return;
      }

      setShowChoice(false);
      router.push(`/workout-sessions/${result.session.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }

  function handleContinue() {
    if (!existingSessionId) return;

    setShowChoice(false);
    router.push(`/workout-sessions/${existingSessionId}`);
  }

  function handleStartFresh() {
    startWorkout(true);
  }

  function handleCancel() {
    setShowChoice(false);
    setExistingSessionId(null);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => startWorkout(false)}
        disabled={isStarting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {isStarting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Play size={16} />
        )}

        {isStarting ? "Starting..." : "Start Workout"}
      </button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {showChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unfinished-workout-title"
            className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2
                  id="unfinished-workout-title"
                  className="text-lg font-semibold"
                >
                  Unfinished Workout
                </h2>

                <p className="text-sm leading-6 text-muted-foreground">
                  You already have an unfinished session for this workout.
                  What would you like to do?
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isStarting}
                aria-label="Close"
                className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleContinue}
                disabled={isStarting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <ArrowRight size={16} />
                Continue Workout
              </button>

              <button
                type="button"
                onClick={handleStartFresh}
                disabled={isStarting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
              >
                {isStarting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}

                {isStarting ? "Starting Fresh..." : "Start Fresh"}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isStarting}
                className="w-full rounded-xl px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Starting fresh will abandon the previous session. Its saved sets
              will remain in your workout history.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
