
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Square, Loader2 } from "lucide-react";

export default function StopWorkoutButton({ sessionId }) {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");

  async function handleStopWorkout() {
    const confirmed = window.confirm(
      "Stop this workout? Your previously saved sets will be kept, but any information in the current unsaved set will be lost."
    );

    if (!confirmed) return;

    setStopping(true);
    setError("");

    try {
      const response = await fetch(
        `/api/workout-sessions/${sessionId}/abandon`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Could not stop this workout.");
        return;
      }

      router.replace("/workouts");
      router.refresh();
    } catch {
      setError("Something went wrong while stopping the workout.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleStopWorkout}
        disabled={stopping}
        className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-card px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
      >
        {stopping ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Square size={15} />
        )}

        {stopping ? "Stopping..." : "Stop Workout"}
      </button>

      {error && (
        <p className="max-w-xs text-right text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
