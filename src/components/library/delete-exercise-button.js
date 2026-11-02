
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteExerciseButton({ exerciseId, exerciseName }) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Remove "${exerciseName}" from your exercise library?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/exercises", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: exerciseId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Could not remove exercise.");
        return;
      }

      router.refresh();
    } catch (error) {
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
        className="flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
      >
        <Trash2 size={16} />
        {isDeleting ? "Removing..." : "Remove"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
