"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Dumbbell,
  SkipForward,
  CheckCircle2,
} from "lucide-react";

function getNextPlannedSet(exercise) {
  const totalSets = Math.max(exercise.targetSets || 1, 1);

  for (let number = 1; number <= totalSets; number++) {
    const saved = exercise.sets.find(
      (set) => set.setNumber === number,
    );

    if (!saved?.isCompleted) return number;
  }

  return null;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function makeDraft(exercise, setNumber) {
  const saved = exercise.sets.find(
    (set) => set.setNumber === setNumber,
  );

  return {
    reps: saved?.reps?.toString() ?? "",
    weight:
      saved?.weight?.toString() ??
      exercise.targetWeight?.toString() ??
      "",
    durationSeconds: saved?.durationSeconds?.toString() ?? "",
    distance: saved?.distance?.toString() ?? "",
  };
}

function hasSetInput(exercise, draft, exerciseTimer) {
  if (!exercise || !draft) return false;

  switch (exercise.trackingType) {
    case "REPS_WEIGHT":
    case "REPS_ONLY":
      return draft.reps !== "";

    case "DISTANCE":
      return draft.distance !== "";

    case "DURATION":
      return exerciseTimer < (exercise.targetDuration || 0);

    default:
      return false;
  }
}

export default function GuidedWorkout({
  sessionId,
  initialExercises,
}) {
  const router = useRouter();

  const [exercises, setExercises] = useState(initialExercises);

  const firstUnfinished = initialExercises.findIndex(
    (exercise) => getNextPlannedSet(exercise) !== null,
  );

  const [activeIndex, setActiveIndex] = useState(
    initialExercises.length === 0 || firstUnfinished === -1
      ? null
      : firstUnfinished,
  );

  // Planned stage first, followed by optional extra-set rounds.
  const [extraSetsMode, setExtraSetsMode] = useState(false);

  // Stores the currently selected extra set for each exercise.
  const [activeSetNumbers, setActiveSetNumbers] = useState({});

  const [activeTab, setActiveTab] = useState("WORKOUT");

  const [drafts, setDrafts] = useState(() => {
    const initial = {};

    initialExercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        initial[`${exercise.id}-${set.setNumber}`] = {
          reps: set.reps?.toString() ?? "",
          weight: set.weight?.toString() ?? "",
          durationSeconds:
            set.durationSeconds?.toString() ?? "",
          distance: set.distance?.toString() ?? "",
        };
      });
    });

    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const toastTimeout = useRef(null);

  function showToast(message) {
    setNotice(message);

    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }

    toastTimeout.current = setTimeout(() => {
      setNotice("");
      toastTimeout.current = null;
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const currentExercise =
    activeIndex === null ? null : exercises[activeIndex];

  const plannedSetNumber = currentExercise
    ? getNextPlannedSet(currentExercise)
    : null;

  const currentSetNumber = currentExercise
    ? activeSetNumbers[currentExercise.id] ?? plannedSetNumber
    : null;

  // An extra set is one selected manually with Add Set.
  const isExtraSet =
    currentExercise &&
    currentSetNumber !== null &&
    activeSetNumbers[currentExercise.id] === currentSetNumber;

  const draftKey =
    currentExercise && currentSetNumber
      ? `${currentExercise.id}-${currentSetNumber}`
      : null;

  const currentDraft =
    draftKey && currentExercise
      ? drafts[draftKey] ||
        makeDraft(currentExercise, currentSetNumber)
      : null;

  // --------------------------------------------------
  // Exercise timer
  // --------------------------------------------------

  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [exerciseTimerRunning, setExerciseTimerRunning] =
    useState(false);

  useEffect(() => {
    setExerciseTimer(currentExercise?.targetDuration || 0);
    setExerciseTimerRunning(false);
  }, [currentExercise?.id, currentSetNumber]);

  useEffect(() => {
    if (!exerciseTimerRunning || exerciseTimer <= 0) {
      if (exerciseTimer <= 0) {
        setExerciseTimerRunning(false);
      }

      return;
    }

    const interval = setInterval(() => {
      setExerciseTimer((current) =>
        Math.max(current - 1, 0),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [exerciseTimerRunning, exerciseTimer]);

  // --------------------------------------------------
  // Rest timer
  // --------------------------------------------------

  const [restMinutes, setRestMinutes] = useState("1");
  const [restSeconds, setRestSeconds] = useState("30");
  const [restRemaining, setRestRemaining] = useState(0);
  const [restRunning, setRestRunning] = useState(false);

  useEffect(() => {
    if (!restRunning || restRemaining <= 0) {
      if (restRemaining <= 0) {
        setRestRunning(false);
      }

      return;
    }

    const interval = setInterval(() => {
      setRestRemaining((current) =>
        Math.max(current - 1, 0),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [restRunning, restRemaining]);

  // --------------------------------------------------
  // Draft handling
  // --------------------------------------------------

  function updateDraft(field, value) {
    if (!draftKey) return;

    setDrafts((current) => ({
      ...current,
      [draftKey]: {
        ...(current[draftKey] || currentDraft),
        [field]: value,
      },
    }));
  }

  // --------------------------------------------------
  // Update saved sets in local state
  // --------------------------------------------------

  function updateLocalSet(savedSet, exerciseId) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [
                ...exercise.sets.filter(
                  (set) =>
                    set.setNumber !== savedSet.setNumber,
                ),
                savedSet,
              ].sort(
                (a, b) => a.setNumber - b.setNumber,
              ),
            }
          : exercise,
      ),
    );
  }

  // --------------------------------------------------
  // Save current set
  // --------------------------------------------------

  async function saveCurrentSet(completed) {
    if (!currentExercise || !currentSetNumber) {
      return true;
    }

    const exercise = currentExercise;
    const setNumber = currentSetNumber;
    const draft =
      currentDraft || makeDraft(exercise, setNumber);

    const trackingType = exercise.trackingType;

    const numberOrNull = (value) =>
      value === "" ? null : Number(value);

    const actualDuration =
      trackingType === "DURATION"
        ? Math.max(
            (exercise.targetDuration || 0) -
              exerciseTimer,
            0,
          )
        : null;

    const hasValues =
      Object.values(draft).some(
        (value) => value !== "",
      ) ||
      (actualDuration !== null && actualDuration > 0);

    if (!completed && !hasValues) {
      return true;
    }

    if (completed) {
      if (
        (trackingType === "REPS_WEIGHT" ||
          trackingType === "REPS_ONLY") &&
        draft.reps === ""
      ) {
        setError("Please enter the number of reps first.");
        return false;
      }

      if (
        trackingType === "DISTANCE" &&
        draft.distance === ""
      ) {
        setError("Please enter the distance first.");
        return false;
      }

      if (
        trackingType === "DURATION" &&
        actualDuration <= 0
      ) {
        setError(
          "Please complete some exercise time first.",
        );
        return false;
      }
    }

    const payload = {
      sessionExerciseId: exercise.id,
      setNumber,

      reps:
        trackingType === "REPS_WEIGHT" ||
        trackingType === "REPS_ONLY"
          ? numberOrNull(draft.reps)
          : null,

      weight:
        trackingType === "REPS_WEIGHT"
          ? numberOrNull(draft.weight)
          : null,

      durationSeconds: actualDuration,

      distance:
        trackingType === "DISTANCE"
          ? numberOrNull(draft.distance)
          : null,

      isCompleted: completed,
    };

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/workout-sessions/${sessionId}/sets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message || "Could not save your set.",
        );

        return false;
      }

      updateLocalSet(result.set, exercise.id);

      showToast(
        completed
          ? `Set ${setNumber} saved ✓`
          : "Progress saved ✓",
      );

      return true;
    } catch {
      setError("Something went wrong while saving.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Next Set
  // Save the planned set and remain on this exercise.
  // --------------------------------------------------

  async function handleCompleteSet() {
    if (
      !currentExercise ||
      !currentSetNumber ||
      isExtraSet ||
      saving
    ) {
      return;
    }

    const saved = await saveCurrentSet(true);

    if (!saved) return;

    setExerciseTimerRunning(false);
  }
// Save an extra set and remain on the same exercise.
async function handleSaveExtraSet() {
  if (!currentExercise || !isExtraSet || saving) return;

  const saved = await saveCurrentSet(true);

  if (!saved) return;

  setActiveSetNumbers((current) => {
    const next = { ...current };
    delete next[currentExercise.id];
    return next;
  });

  setExerciseTimerRunning(false);
  setError("");

  showToast("Extra set saved! You can add another.");
}
  // --------------------------------------------------
  // Add an extra set to the current exercise
  // --------------------------------------------------

  function handleAddSet() {
    if (
      !currentExercise ||
      saving ||
      currentSetNumber
    ) {
      return;
    }

    const highestSet = Math.max(
      0,
      ...currentExercise.sets.map(
        (set) => set.setNumber,
      ),
    );

    const newSetNumber = highestSet + 1;

    setActiveSetNumbers((current) => ({
      ...current,
      [currentExercise.id]: newSetNumber,
    }));

    setExerciseTimer(
      currentExercise.targetDuration || 0,
    );

    setExerciseTimerRunning(false);
    setError("");

    showToast(
      `Ready to record extra set ${newSetNumber}`,
    );
  }

  // --------------------------------------------------
  // Next Exercise
  // --------------------------------------------------

  async function handleNextExercise() {
    if (!currentExercise || saving) return;

    const selectedSetIsExtra =
      currentSetNumber !== null &&
      activeSetNumbers[currentExercise.id] ===
        currentSetNumber;

    const enteredData = hasSetInput(
      currentExercise,
      currentDraft,
      exerciseTimer,
    );

    // Save the extra set if the user entered data.
    if (selectedSetIsExtra && enteredData) {
      const saved = await saveCurrentSet(true);

      if (!saved) return;
    }

    // Save the planned set if the user entered data.
    if (
      !selectedSetIsExtra &&
      currentSetNumber &&
      enteredData
    ) {
      const saved = await saveCurrentSet(true);

      if (!saved) return;
    }

    // Clear the extra-set selection when leaving.
    if (selectedSetIsExtra) {
      setActiveSetNumbers((current) => {
        const next = { ...current };

        delete next[currentExercise.id];

        return next;
      });
    }

    setExerciseTimerRunning(false);
    setError("");

    // Extra-set round:
    // Move sequentially through exercises.
    if (extraSetsMode) {
      const nextIndex = activeIndex + 1;

      if (nextIndex < exercises.length) {
        setActiveIndex(nextIndex);

        showToast(
          `Moved to ${exercises[nextIndex].exerciseName}`,
        );
      } else {
        setActiveIndex(null);

        showToast("Extra-set round finished.");
      }

      return;
    }

    // Planned stage:
    // If the current set was completed, temporarily update
    // the exercise so the next-set search sees it as completed.
    let updatedCurrentExercise = currentExercise;

    if (
      currentSetNumber &&
      !selectedSetIsExtra &&
      enteredData
    ) {
      updatedCurrentExercise = {
        ...currentExercise,
        sets: [
          ...currentExercise.sets.filter(
            (set) =>
              set.setNumber !== currentSetNumber,
          ),
          {
            setNumber: currentSetNumber,
            isCompleted: true,
          },
        ],
      };
    }

    const updatedExercises = exercises.map(
      (exercise, index) =>
        index === activeIndex
          ? updatedCurrentExercise
          : exercise,
    );

    // Search for the next exercise with an unfinished
    // planned set. This alternates between exercises.
    for (
      let step = 1;
      step <= exercises.length;
      step++
    ) {
      const nextIndex =
        (activeIndex + step) % exercises.length;

      const nextExercise = updatedExercises[nextIndex];

      if (
        getNextPlannedSet(nextExercise) !== null
      ) {
        setActiveIndex(nextIndex);

        showToast(
          `Moved to ${nextExercise.exerciseName}`,
        );

        return;
      }
    }

    // All planned sets are complete.
    setActiveIndex(null);

    showToast("All planned sets completed!");
  }

  // --------------------------------------------------
  // Start another extra-set round
  // --------------------------------------------------

  function handleStartExtraSets() {
    if (exercises.length === 0) return;

    setExtraSetsMode(true);
    setActiveIndex(0);
    setActiveTab("WORKOUT");
    setExerciseTimerRunning(false);
    setError("");

    showToast("Extra-set round started.");
  }

  // --------------------------------------------------
  // Complete workout
  // --------------------------------------------------

  async function handleCompleteWorkout() {
    if (completing || saving) return;

    setCompleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/workout-sessions/${sessionId}/complete`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Could not complete this workout.",
        );

        return;
      }

      router.push("/workouts");
      router.refresh();
    } catch {
      setError(
        "Something went wrong while completing the workout.",
      );
    } finally {
      setCompleting(false);
    }
  }

  // --------------------------------------------------
  // Rest timer controls
  // --------------------------------------------------

  function startRest() {
    const minutes = Math.max(
      Number(restMinutes) || 0,
      0,
    );

    const seconds = Math.min(
      Math.max(Number(restSeconds) || 0, 0),
      59,
    );

    const total = minutes * 60 + seconds;

    if (total <= 0) return;

    setRestRemaining(total);
    setRestRunning(true);
  }

  // --------------------------------------------------
  // Progress calculations
  // --------------------------------------------------

  const completedCount = exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.filter(
        (set) => set.isCompleted,
      ).length,
    0,
  );

  const plannedCount = exercises.reduce(
    (total, exercise) =>
      total +
      Math.max(exercise.targetSets || 1, 1),
    0,
  );

  const progress =
    plannedCount > 0
      ? Math.min(
          (completedCount / plannedCount) * 100,
          100,
        )
      : 0;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-10">
      {/* Header and progress */}
      <div>
        <p className="text-sm text-muted-foreground">
          Workout session
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">
            Your workout
          </h1>

          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {Math.min(completedCount, plannedCount)} /{" "}
            {plannedCount} sets
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {extraSetsMode && (
          <p className="mt-2 text-xs font-medium text-primary">
            Extra-set round
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab("WORKOUT")}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${
            activeTab === "WORKOUT"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Dumbbell size={17} />
          Workout
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("REST")}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${
            activeTab === "REST"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Coffee size={17} />
          Rest
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ==========================================
          WORKOUT TAB
      ========================================== */}

      {activeTab === "WORKOUT" && (
        <>
          {currentExercise ? (
            <>
              {/* Current exercise heading */}
              <section className="rounded-2xl border border-border bg-card px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">
                    {currentExercise.exerciseName}
                  </h2>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {activeIndex + 1} / {exercises.length}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {currentExercise.targetSets || 1} planned sets
                  {currentExercise.targetRepsMin != null &&
                    ` · ${currentExercise.targetRepsMin}${
                      currentExercise.targetRepsMax != null &&
                      currentExercise.targetRepsMax !==
                        currentExercise.targetRepsMin
                        ? `–${currentExercise.targetRepsMax}`
                        : ""
                    } reps`}
                </p>
              </section>

              {/* ======================================
                  ACTIVE SET
              ====================================== */}

              {currentSetNumber ? (
                <>
                  <section className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Record your set
                      </h3>

                      <span className="text-sm text-muted-foreground">
                        Set {currentSetNumber}
                        {isExtraSet && " · Extra"}
                      </span>
                    </div>

                    {/* Reps and weight */}
                    {(currentExercise.trackingType ===
                      "REPS_WEIGHT" ||
                      currentExercise.trackingType ===
                        "REPS_ONLY") && (
                      <div
                        className={`grid gap-4 ${
                          currentExercise.trackingType ===
                          "REPS_WEIGHT"
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        <div>
                          <label className="mb-2 block text-sm text-muted-foreground">
                            Reps
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={currentDraft?.reps ?? ""}
                            onChange={(event) =>
                              updateDraft(
                                "reps",
                                event.target.value,
                              )
                            }
                            placeholder="Enter reps"
                            className="w-full rounded-xl border border-input bg-background px-4 py-4 text-xl"
                          />
                        </div>

                        {currentExercise.trackingType ===
                          "REPS_WEIGHT" && (
                          <div>
                            <label className="mb-2 block text-sm text-muted-foreground">
                              Weight (kg)
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                currentDraft?.weight ?? ""
                              }
                              onChange={(event) =>
                                updateDraft(
                                  "weight",
                                  event.target.value,
                                )
                              }
                              placeholder="Enter weight"
                              className="w-full rounded-xl border border-input bg-background px-4 py-4 text-xl"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Distance */}
                    {currentExercise.trackingType ===
                      "DISTANCE" && (
                      <div>
                        <label className="mb-2 block text-sm text-muted-foreground">
                          Distance (km)
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            currentDraft?.distance ?? ""
                          }
                          onChange={(event) =>
                            updateDraft(
                              "distance",
                              event.target.value,
                            )
                          }
                          placeholder="Enter distance"
                          className="w-full rounded-xl border border-input bg-background px-4 py-4 text-xl"
                        />
                      </div>
                    )}

                    {/* Duration */}
                    {currentExercise.trackingType ===
                      "DURATION" && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          EXERCISE TIMER
                        </p>

                        <p className="my-6 text-6xl font-bold tabular-nums">
                          {formatTime(exerciseTimer)}
                        </p>

                        <p className="mb-5 text-xs text-muted-foreground">
                          Target:{" "}
                          {formatTime(
                            currentExercise.targetDuration || 0,
                          )}
                        </p>

                        <div className="flex justify-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExerciseTimerRunning(
                                !exerciseTimerRunning,
                              )
                            }
                            disabled={exerciseTimer <= 0}
                            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            {exerciseTimerRunning ? (
                              <Pause size={17} />
                            ) : (
                              <Play size={17} />
                            )}

                            {exerciseTimerRunning
                              ? "Pause"
                              : "Start"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setExerciseTimer(
                                currentExercise.targetDuration ||
                                  0,
                              );

                              setExerciseTimerRunning(false);
                            }}
                            className="flex items-center gap-2 rounded-xl border border-border px-4 py-3"
                          >
                            <RotateCcw size={17} />
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Active-set buttons */}
                  
{/* Active-set buttons */}
<div className="grid grid-cols-2 gap-3">
  {isExtraSet ? (
    <button
      type="button"
      onClick={handleSaveExtraSet}
      disabled={saving}
      className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-4 font-semibold transition hover:bg-muted disabled:opacity-50"
    >
      {saving ? "Saving..." : "Save Set"}
    </button>
  ) : (
    !extraSetsMode && (
      <button
        type="button"
        onClick={handleCompleteSet}
        disabled={saving}
        className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-4 font-semibold transition hover:bg-muted disabled:opacity-50"
      >
        {saving ? "Saving..." : "Next Set"}
      </button>
    )
  )}

  <button
    type="button"
    onClick={handleNextExercise}
    disabled={saving}
    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
  >
    <SkipForward size={17} />
    Next Exercise
  </button>
</div>
                </>
              ) : (
                /* ======================================
                   NO ACTIVE SET
                ====================================== */

                <section className="rounded-2xl border border-border bg-card p-6">
                  <div className="text-center">
                    <h3 className="font-semibold">
                      Exercise sets completed
                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground">
                      You can add an extra set or move to
                      the next exercise.
                    </p>
                  </div>

                  {/* Add Set is available after planned
                      sets are finished, and during extra rounds. */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleAddSet}
                      disabled={saving}
                      className="rounded-xl border border-border bg-card px-4 py-4 font-semibold transition hover:bg-muted disabled:opacity-50"
                    >
                      + Add Set
                    </button>

                    <button
                      type="button"
                      onClick={handleNextExercise}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                      <SkipForward size={17} />
                      Next Exercise
                    </button>
                  </div>
                </section>
              )}

              {/* Compact recorded sets */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <span className="font-medium">
                  Sets recorded:
                </span>

                {currentExercise.sets.length === 0 ? (
                  <span>None yet</span>
                ) : (
                  [...currentExercise.sets]
                    .sort(
                      (a, b) => a.setNumber - b.setNumber,
                    )
                    .map((set) => (
                      <span
                        key={set.id || set.setNumber}
                        className={
                          set.isCompleted
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {set.setNumber}:{" "}
                        {currentExercise.trackingType ===
                          "REPS_WEIGHT" &&
                          `${set.reps ?? "—"} reps · ${
                            set.weight ?? "—"
                          } kg`}

                        {currentExercise.trackingType ===
                          "REPS_ONLY" &&
                          `${set.reps ?? "—"} reps`}

                        {currentExercise.trackingType ===
                          "DURATION" &&
                          formatTime(
                            set.durationSeconds || 0,
                          )}

                        {currentExercise.trackingType ===
                          "DISTANCE" &&
                          `${set.distance ?? "—"} km`}

                        {set.isCompleted
                          ? " ✓"
                          : " (unfinished)"}
                      </span>
                    ))
                )}
              </div>
            </>
          ) : exercises.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              This workout has no exercises.
            </p>
          ) : (
            /* ==========================================
               WORKOUT SUMMARY
            ========================================== */

            <section className="rounded-2xl border border-border bg-card p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 size={26} />
                </div>

                <h2 className="text-xl font-bold">
                  {extraSetsMode
                    ? "Extra-set round finished!"
                    : "All planned sets completed!"}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Here's your workout summary.
                </p>
              </div>

              {/* Exercise summary */}
              <div className="mt-6 space-y-4">
                {exercises.map((exercise) => {
                  const completedSets =
                    exercise.sets.filter(
                      (set) => set.isCompleted,
                    ).length;

                  return (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium">
                          {exercise.exerciseName}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {completedSets} sets completed
                        </p>
                      </div>

                      <CheckCircle2
                        size={19}
                        className="text-primary"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Summary actions */}
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-sm text-muted-foreground">
                  {completedCount} total sets recorded
                </p>

                <button
                  type="button"
                  onClick={handleStartExtraSets}
                  disabled={completing || saving}
                  className="mt-4 w-full rounded-xl border border-border bg-card px-4 py-4 font-semibold transition hover:bg-muted disabled:opacity-50"
                >
                  + Add Sets
                </button>

                <button
                  type="button"
                  onClick={handleCompleteWorkout}
                  disabled={completing || saving}
                  className="mt-3 w-full rounded-xl bg-primary px-4 py-4 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {completing
                    ? "Completing..."
                    : "Complete Workout"}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* ==========================================
          REST TAB
      ========================================== */}

      {activeTab === "REST" && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Coffee size={20} className="text-primary" />

            <h2 className="text-xl font-semibold">
              Rest timer
            </h2>
          </div>

          <div className="my-8 text-center">
            <p className="text-6xl font-bold tabular-nums">
              {formatTime(restRemaining)}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              {restRunning
                ? "Resting..."
                : restRemaining > 0
                  ? "Timer paused"
                  : "Ready when you are"}
            </p>
          </div>

          {/* Timer duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Minutes
              </label>

              <input
                type="number"
                min="0"
                value={restMinutes}
                onChange={(event) =>
                  setRestMinutes(event.target.value)
                }
                className="w-full rounded-xl border border-input bg-background px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Seconds
              </label>

              <input
                type="number"
                min="0"
                max="59"
                value={restSeconds}
                onChange={(event) =>
                  setRestSeconds(event.target.value)
                }
                className="w-full rounded-xl border border-input bg-background px-4 py-3"
              />
            </div>
          </div>

          {/* Timer buttons */}
          <div className="mt-5 flex gap-2">
            {!restRunning && (
              <button
                type="button"
                onClick={
                  restRemaining > 0
                    ? () => setRestRunning(true)
                    : startRest
                }
                className="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
              >
                {restRemaining > 0
                  ? "Resume"
                  : "Start Rest"}
              </button>
            )}

            {restRunning && (
              <button
                type="button"
                onClick={() => setRestRunning(false)}
                className="flex-1 rounded-xl border border-border px-4 py-3 font-semibold"
              >
                Pause
              </button>
            )}

            {restRemaining > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRestRunning(false);
                  setRestRemaining(0);
                }}
                className="rounded-xl border border-border px-4 py-3"
              >
                Skip
              </button>
            )}

            <button
              type="button"
              onClick={startRest}
              className="rounded-xl border border-border px-4 py-3"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("WORKOUT")}
            className="mt-5 w-full rounded-xl bg-muted px-4 py-3 text-sm font-semibold"
          >
            Return to Workout
          </button>
        </section>
      )}

      {/* Floating toast */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground shadow-xl"
        >
          {notice}
        </div>
      )}
    </div>
  );
}