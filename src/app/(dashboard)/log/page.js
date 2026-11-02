
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "../loading.js";
import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";
import WorkoutCalendar from "../../../components/log/workout-calendar.js";

async function LogsContent() {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const workouts = await prisma.workoutSession.findMany({
    where: {
      userId: session.user.id,
      status: "COMPLETED",
    },
    include: {
      exercises: {
        include: {
          sets: {
            where: {
              isCompleted: true,
            },
            orderBy: {
              setNumber: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: {
      completedAt: "desc",
    },
  });

  // Prepare simple data for the interactive calendar.
 const calendarWorkouts = workouts.map((workout) => ({
  id: workout.id,
  workoutName: workout.workoutName,
  completedAt: workout.completedAt?.toISOString() ?? null,
  exercises: workout.exercises.map((exercise) => ({
    exerciseName: exercise.exerciseName,
  })),
   completedSetCount: workout.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.filter((set) => set.isCompleted).length,
    0
  ),
}));

  return (
    <div className="p-6 md:p-8">
      {/* Page heading */}
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          FITNESS TRACKER
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Workout Log
        </h1>

        <p className="mt-2 text-muted-foreground">
          Look back at your completed workouts and training history.
        </p>
      </div>

      {/* Monthly activity calendar */}
      <div className="mb-10">
        <WorkoutCalendar workouts={calendarWorkouts} />
      </div>

      {/* Workout history */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Your Training History
        </h2>

        <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
          {workouts.length} {workouts.length === 1 ? "workout" : "workouts"}
        </span>
      </div>

      {/* Empty state */}
      {workouts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <h3 className="text-xl font-semibold">
            No completed workouts yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your completed training sessions will appear here.
            Start a workout and complete it to build your training history.
          </p>

          <Link
            href="/workouts"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Go to Workouts
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => {
            const exerciseCount = workout.exercises.length;

            const completedSetCount = workout.exercises.reduce(
              (total, exercise) => total + exercise.sets.length,
              0
            );

            const startTime = new Date(workout.startedAt);
            const endTime = workout.completedAt
              ? new Date(workout.completedAt)
              : null;

            const duration = endTime
              ? Math.max(
                  0,
                  Math.round((endTime - startTime) / 60000)
                )
              : null;

            return (
              <Link
                href={`/log/${workout.id}`}
                key={workout.id}
                className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-primary">
                      Completed Workout
                    </p>

                    <h3 className="mt-1 text-xl font-semibold">
                      {workout.workoutName}
                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {endTime
                        ? endTime.toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Date unavailable"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 sm:min-w-64">
                    <div>
                      <p className="text-lg font-bold">
                        {exerciseCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Exercises
                      </p>
                    </div>

                    <div>
                      <p className="text-lg font-bold">
                        {completedSetCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sets
                      </p>
                    </div>

                    <div>
                      <p className="text-lg font-bold">
                        {duration !== null ? `${duration}m` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    {workout.exercises
                      .map((exercise) => exercise.exerciseName)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default function LogsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LogsContent />
    </Suspense>
  );
}