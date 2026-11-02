
import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Dumbbell, Clock3, Play } from "lucide-react";
import Link from "next/link";

import EditWorkoutForm from "../../../components/workouts/edit-workout-form.js";
import CreateWorkoutForm from "../../../components/workouts/create-workout-form.js";
import DeleteWorkoutButton from "../../../components/workouts/delete-workout-button.js";
import StartWorkoutButton from "../../../components/workouts/start-workout-button.js";
import Loading from "../loading.js";

async function WorkoutsContent() {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch the user's active exercises.
  const exercises = await prisma.exercise.findMany({
    where: {
      userId: session.user.id,
      isArchived: false,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      trackingType: true,
    },
  });

  // Fetch the user's saved workouts.
  const workouts = await prisma.workout.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Fetch unfinished workout sessions.
  const unfinishedSessions = await prisma.workoutSession.findMany({
    where: {
      userId: session.user.id,
      status: "IN_PROGRESS",
    },
    include: {
      exercises: {
        include: {
          sets: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  // Keep only the newest unfinished session for each saved workout.
  const latestSessionsByWorkout = new Map();

  for (const unfinishedSession of unfinishedSessions) {
    const key = unfinishedSession.workoutId || unfinishedSession.id;

    if (!latestSessionsByWorkout.has(key)) {
      latestSessionsByWorkout.set(key, unfinishedSession);
    }
  }

  const uniqueUnfinishedSessions = Array.from(
    latestSessionsByWorkout.values()
  );

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-primary">
          YOUR TRAINING
        </p>

        <h1 className="text-3xl font-bold text-foreground">
          My Workouts
        </h1>

        <p className="mt-2 text-muted-foreground">
          Build and manage your reusable workouts.
        </p>
      </div>

      {/* Workout creation form */}
      <CreateWorkoutForm exercises={exercises} />

      {/* Unfinished workout sessions */}
      {uniqueUnfinishedSessions.length > 0 && (
        <div className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Unfinished Workouts
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Pick up where you left off.
              </p>
            </div>

            <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
              {uniqueUnfinishedSessions.length}{" "}
              {uniqueUnfinishedSessions.length === 1
                ? "session"
                : "sessions"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {uniqueUnfinishedSessions.map((unfinishedSession) => {
              const exerciseCount =
                unfinishedSession.exercises.length;

              const completedSets =
                unfinishedSession.exercises.reduce(
                  (total, exercise) =>
                    total +
                    exercise.sets.filter(
                      (set) => set.isCompleted
                    ).length,
                  0
                );

              const startedAt = new Date(
                unfinishedSession.startedAt
              );

              return (
                <div
                  key={unfinishedSession.id}
                  className="rounded-2xl border border-primary/30 bg-card p-5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-secondary p-2 text-primary">
                      <Dumbbell size={18} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {unfinishedSession.name}
                      </h3>

                      <p className="mt-1 text-xs text-primary">
                        In progress
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Dumbbell size={15} />
                      {exerciseCount}{" "}
                      {exerciseCount === 1
                        ? "exercise"
                        : "exercises"}
                    </span>

                    <span className="flex items-center gap-2">
                      <Clock3 size={15} />
                      {completedSets} sets completed
                    </span>
                  </div>

                  <p className="mb-4 text-xs text-muted-foreground">
                    Started {startedAt.toLocaleDateString()} at{" "}
                    {startedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <Link
                    href={`/workout-sessions/${unfinishedSession.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    <Play size={16} fill="currentColor" />
                    Resume Workout
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved workouts */}
      <div className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Saved Workouts
          </h2>

          <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
            {workouts.length}{" "}
            {workouts.length === 1 ? "workout" : "workouts"}
          </span>
        </div>

        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Dumbbell
              size={28}
              className="mx-auto mb-3 text-primary"
            />

            <h3 className="font-semibold text-foreground">
              No workouts yet
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Your saved workouts will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-secondary p-2 text-primary">
                    <Dumbbell size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground">
                      {workout.name}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {workout.exercises.length}{" "}
                      {workout.exercises.length === 1
                        ? "exercise"
                        : "exercises"}
                    </p>
                  </div>
                </div>

                <StartWorkoutButton workoutId={workout.id} />

                {workout.description && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {workout.description}
                  </p>
                )}

                <div className="space-y-3 border-t border-border pt-4">
                  {workout.exercises.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs text-secondary-foreground">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {item.exercise.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {item.targetSets
                            ? `${item.targetSets} sets`
                            : ""}
                          {item.targetRepsMin
                            ? ` · ${item.targetRepsMin}${
                                item.targetRepsMax &&
                                item.targetRepsMax !==
                                  item.targetRepsMin
                                  ? `–${item.targetRepsMax}`
                                  : ""
                              } reps`
                            : ""}
                          {item.targetDuration
                            ? ` · ${item.targetDuration} sec`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
                  Created{" "}
                  {new Date(workout.createdAt).toLocaleDateString()}
                </p>

                <div className="mt-5 flex items-baseline-last justify-between pt-4">
                  <EditWorkoutForm
                    workout={workout}
                    exercises={exercises}
                  />

                  <DeleteWorkoutButton
                    workoutId={workout.id}
                    workoutName={workout.name}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkoutsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WorkoutsContent />
    </Suspense>
  );
}
