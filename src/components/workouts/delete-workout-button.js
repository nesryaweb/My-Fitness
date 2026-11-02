
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteWorkoutButton({ workoutId, workoutName }) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workoutName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/workouts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: workoutId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Could not delete workout.");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
      >
        <Trash2 size={16} />
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
