"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Dumbbell,
  Plus,
  Trash2,
  X,
  ArrowRightLeft,
  Check,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

import StartWorkoutButton from "../workouts/start-workout-button.js";

const days = [
  { value: 1, name: "Monday", short: "MON" },
  { value: 2, name: "Tuesday", short: "TUE" },
  { value: 3, name: "Wednesday", short: "WED" },
  { value: 4, name: "Thursday", short: "THU" },
  { value: 5, name: "Friday", short: "FRI" },
  { value: 6, name: "Saturday", short: "SAT" },
  { value: 0, name: "Sunday", short: "SUN" },
];

export default function WeeklyPlanContent({ plan, workouts }) {
  const [scheduledWorkouts, setScheduledWorkouts] = useState(
    plan.scheduledWorkouts,
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedMoveDays, setSelectedMoveDays] = useState([]);
  const [movingWorkoutId, setMovingWorkoutId] = useState(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  const scheduledCount = scheduledWorkouts.length;

  const activeDays = days.filter((day) =>
    scheduledWorkouts.some((item) => item.dayOfWeek === day.value),
  ).length;

  function toggleDay(dayOfWeek) {
    setSelectedDays((current) =>
      current.includes(dayOfWeek)
        ? current.filter((day) => day !== dayOfWeek)
        : [...current, dayOfWeek],
    );
  }

  function toggleMoveDay(dayOfWeek) {
    setSelectedMoveDays((current) =>
      current.includes(dayOfWeek)
        ? current.filter((day) => day !== dayOfWeek)
        : [...current, dayOfWeek],
    );
  }

  async function addWorkoutToDays() {
    if (!selectedWorkout) {
      showToast("Choose a workout first.", "error");
      return;
    }

    if (selectedDays.length === 0) {
      showToast("Select at least one day.", "error");
      return;
    }

    setBusy("adding");

    try {
      const response = await fetch("/api/weekly-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workoutId: selectedWorkout,
          dayOfWeeks: selectedDays,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not schedule this workout.");
      }

      const newEntries = result.scheduledWorkouts || [];

      setScheduledWorkouts((current) => [...current, ...newEntries]);

      setSelectedWorkout("");
      setSelectedDays([]);
      setShowAddForm(false);

      showToast(result.message || "Workout added to your schedule.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy("");
    }
  }

  async function moveWorkout(id, dayOfWeeks) {
    if (busy !== "" || dayOfWeeks.length === 0) return;

    setBusy(`move-${id}`);

    try {
      const response = await fetch("/api/weekly-plan", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          dayOfWeeks,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not update workout.");
      }

      // Replace the old schedule entry with the newly selected days.
    setScheduledWorkouts((current) => [
  ...current.filter(
    (item) => item.workout.id !== result.workoutId
  ),
  ...(result.scheduledWorkouts || []),
]);

      setMovingWorkoutId(null);
      setSelectedMoveDays([]);

      showToast("Workout schedule updated successfully.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy("");
    }
  }

  async function removeWorkout(id) {
    setBusy(`remove-${id}`);

    try {
      const response = await fetch("/api/weekly-plan", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not remove workout.");
      }

      setScheduledWorkouts((current) =>
        current.filter((item) => item.id !== id),
      );

      if (movingWorkoutId === id) {
        setMovingWorkoutId(null);
        setSelectedMoveDays([]);
      }

      showToast("Workout removed from your weekly plan.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-5 z-[100] w-[calc(100%-40px)] max-w-sm animate-in slide-in-from-top-2 fade-in duration-200"
        >
          <div
            className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xl ${
              toast.type === "error"
                ? "border-destructive/40"
                : "border-primary/30"
            }`}
          >
            {toast.type === "error" ? (
              <CircleAlert size={20} className="shrink-0 text-destructive" />
            ) : (
              <CircleCheck size={20} className="shrink-0 text-primary" />
            )}

            <p className="flex-1 text-sm font-medium text-foreground">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Page heading */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-primary">YOUR TRAINING</p>

        <h1 className="text-3xl font-bold text-foreground">Weekly Plan</h1>

        <p className="mt-2 text-muted-foreground">
          Organize your training throughout the week.
        </p>
      </div>

      {/* Weekly overview */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="flex min-w-[180px] items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
          <div className="rounded-lg bg-secondary p-2 text-primary">
            <Dumbbell size={20} />
          </div>

          <div>
            <p className="text-2xl font-bold text-foreground">
              {scheduledCount}
            </p>

            <p className="text-xs text-muted-foreground">Scheduled workouts</p>
          </div>
        </div>

        <div className="flex min-w-[180px] items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
          <div className="rounded-lg bg-secondary p-2 text-primary">
            <CalendarDays size={20} />
          </div>

          <div>
            <p className="text-2xl font-bold text-foreground">
              {activeDays}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / 7
              </span>
            </p>

            <p className="text-xs text-muted-foreground">Training days</p>
          </div>
        </div>
      </div>

      {/* Schedule heading and add button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Your seven-day training schedule
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm((current) => !current);
            setToast(null);
          }}
          disabled={busy !== ""}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? "Cancel" : "Add workout"}
        </button>
      </div>

      {/* Multi-day workout form */}
      {showAddForm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="font-semibold text-foreground">
            Add workout to your schedule
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose a workout and select every day you want to do it.
          </p>

          {workouts.length === 0 ? (
            <p className="mt-5 rounded-lg bg-background p-4 text-sm text-muted-foreground">
              You haven't created any workouts yet. Create one in My Workouts
              first.
            </p>
          ) : (
            <>
              {/* Workout selection */}
              <div className="mt-5">
                <label
                  htmlFor="weekly-workout"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Choose workout
                </label>

                <select
                  id="weekly-workout"
                  value={selectedWorkout}
                  onChange={(event) => {
                    setSelectedWorkout(event.target.value);
                    setSelectedDays([]);
                  }}
                  disabled={busy !== ""}
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Select a workout</option>

                  {workouts.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day selection */}
              <div className="mt-5">
                <p className="mb-3 text-sm font-medium text-foreground">
                  Select training days
                </p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {days.map((day) => {
                    const isSelected = selectedDays.includes(day.value);

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        disabled={busy !== "" || !selectedWorkout}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isSelected
                            ? "border-primary bg-secondary text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                        }`}
                      >
                        {isSelected && <Check size={15} />}
                        {day.name}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {selectedDays.length}{" "}
                  {selectedDays.length === 1 ? "day" : "days"} selected
                </p>
              </div>

              {/* Submit */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={addWorkoutToDays}
                  disabled={
                    busy !== "" || !selectedWorkout || selectedDays.length === 0
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />

                  {busy === "adding" ? "Adding workout..." : "Add to schedule"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedWorkout("");
                    setSelectedDays([]);
                  }}
                  disabled={busy !== ""}
                  className="rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Weekly schedule */}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {days.map((day) => {
          const dayWorkouts = scheduledWorkouts.filter(
            (item) => item.dayOfWeek === day.value,
          );

          return (
            <section key={day.value} className="px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Day information */}
                <div className="flex w-full shrink-0 items-center gap-3 sm:w-36">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-bold tracking-wide text-primary">
                    {day.short}
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground">
                      {day.name}
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      {dayWorkouts.length > 0
                        ? `${dayWorkouts.length} ${
                            dayWorkouts.length === 1 ? "workout" : "workouts"
                          }`
                        : "Rest day"}
                    </p>
                  </div>
                </div>

                {/* Workouts for this day */}
                <div className="min-w-0 flex-1 space-y-2">
                  {dayWorkouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No workout scheduled
                    </p>
                  ) : (
                    dayWorkouts.map((item) => {
                      const isMoving = movingWorkoutId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border bg-background p-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="rounded-lg bg-secondary p-2 text-primary">
                                <Dumbbell size={17} />
                              </div>

                              <p className="truncate text-sm font-medium text-foreground">
                                {item.workout.name}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <StartWorkoutButton workoutId={item.workout.id} />

                              <button
                                type="button"
                                onClick={() => {
                                  setMovingWorkoutId(isMoving ? null : item.id);

                                  // Select every day where this same workout is scheduled.
                                  setSelectedMoveDays(
                                    isMoving
                                      ? []
                                      : scheduledWorkouts
                                          .filter(
                                            (scheduled) =>
                                              scheduled.workout.id ===
                                              item.workout.id,
                                          )
                                          .map(
                                            (scheduled) => scheduled.dayOfWeek,
                                          ),
                                  );
                                }}
                                disabled={busy !== ""}
                                className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition disabled:opacity-50 ${
                                  isMoving
                                    ? "border-primary bg-secondary text-primary"
                                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                                }`}
                              >
                                {isMoving ? (
                                  <X size={14} />
                                ) : (
                                  <ArrowRightLeft size={14} />
                                )}

                                {isMoving ? "Cancel" : "Move"}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeWorkout(item.id)}
                                disabled={busy !== ""}
                                aria-label={`Remove ${item.workout.name}`}
                                title="Remove workout"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Move workout selector */}
                          {isMoving && (
                            <div className="mt-4 border-t border-border pt-4">
                              <p className="mb-3 text-xs font-medium text-muted-foreground">
                                SELECT TRAINING DAYS FOR{" "}
                                {item.workout.name.toUpperCase()}
                              </p>

                              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                                {days.map((option) => {
                                  const isSelected = selectedMoveDays.includes(
                                    option.value,
                                  );

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      disabled={busy !== ""}
                                      onClick={() =>
                                        toggleMoveDay(option.value)
                                      }
                                      className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                        isSelected
                                          ? "border-primary bg-secondary text-primary"
                                          : "border-border bg-card text-muted-foreground hover:border-primary hover:bg-secondary hover:text-primary"
                                      }`}
                                    >
                                      {option.short}

                                      {isSelected && (
                                        <Check
                                          size={13}
                                          className="mx-auto mt-1"
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              <p className="mt-3 text-xs text-muted-foreground">
                                {selectedMoveDays.length}{" "}
                                {selectedMoveDays.length === 1 ? "day" : "days"}{" "}
                                selected
                              </p>

                              <div className="mt-4 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    moveWorkout(item.id, selectedMoveDays)
                                  }
                                  disabled={
                                    busy !== "" || selectedMoveDays.length === 0
                                  }
                                  className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busy === `move-${item.id}`
                                    ? "Saving..."
                                    : "Save schedule"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovingWorkoutId(null);
                                    setSelectedMoveDays([]);
                                  }}
                                  disabled={busy !== ""}
                                  className="rounded-lg px-3 py-2.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
