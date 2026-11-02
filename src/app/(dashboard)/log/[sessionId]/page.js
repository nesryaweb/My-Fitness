import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "../../../../auth.js";
import { prisma } from "../../../../lib/prisma.js";

function formatDuration(seconds) {
  if (seconds == null) return null;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${remainingSeconds} sec`;
  if (remainingSeconds === 0) return `${minutes} min`;

  return `${minutes} min ${remainingSeconds} sec`;
}

export default async function WorkoutDetailsPage({ params }) {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { sessionId } = await params;

  const workout = await prisma.workoutSession.findFirst({
    where: {
      id: sessionId,
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
  });

  if (!workout) {
    notFound();
  }

  const startTime = new Date(workout.startedAt);
  const endTime = workout.completedAt
    ? new Date(workout.completedAt)
    : null;

  const duration = endTime
    ? Math.max(0, Math.round((endTime - startTime) / 60000))
    : null;

  const totalSets = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0
  );

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/log"
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Back to Workout Log
      </Link>

      <div className="mb-8 mt-6">
        <p className="text-sm font-medium text-primary">
          WORKOUT HISTORY
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {workout.workoutName}
        </h1>

        <p className="mt-2 text-muted-foreground">
          {endTime
            ? endTime.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Date unavailable"}
        </p>
      </div>

      {/* Workout summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl font-bold">
            {workout.exercises.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Exercises
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-2xl font-bold">{totalSets}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed Sets
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-border bg-card p-5 md:col-span-1">
          <p className="text-2xl font-bold">
            {duration !== null ? `${duration} min` : "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Duration
          </p>
        </div>
      </div>

      {/* Exercise details */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Exercises Performed
        </h2>

        {workout.exercises.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            No completed exercises were recorded for this workout.
          </div>
        ) : (
          <div className="space-y-4">
            {workout.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {exercise.exerciseName}
                  </h3>

                  <span className="text-sm text-muted-foreground">
                    {exercise.sets.length}{" "}
                    {exercise.sets.length === 1 ? "set" : "sets"}
                  </span>
                </div>

                {exercise.sets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No completed sets recorded.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3"
                      >
                        <span className="text-sm font-medium">
                          Set {set.setNumber}
                        </span>

                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {set.reps != null && (
                            <span>{set.reps} reps</span>
                          )}

                         {set.weight != null && (
  <span>{set.weight.toString()} kg</span>
)}

                          {set.durationSeconds != null && (
                            <span>
                              {formatDuration(set.durationSeconds)}
                            </span>
                          )}

                          {set.distance != null && (
  <span>{set.distance.toString()} distance</span>
)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {exercise.notes && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Notes: {exercise.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {workout.notes && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Workout Notes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {workout.notes}
          </p>
        </div>
      )}
    </div>
  );
}