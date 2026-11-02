import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";
import { redirect } from "next/navigation";import { Suspense } from "react";
import Loading from "../loading.js";
import { Dumbbell } from "lucide-react";
import { connection } from "next/server";
import AddExerciseForm from "../../../components/library/add-exercise-form.js";
import EditExerciseForm from "../../../components/library/edit-exercise-form.js";
import DeleteExerciseButton from "../../../components/library/delete-exercise-button.js";
const trackingLabels = {
  REPS_WEIGHT: "Reps & Weight",
  REPS_ONLY: "Reps Only",
  DURATION: "Duration",
  DISTANCE: "Distance",
};

async function LibraryContent() {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get this user's active exercises from Neon.
  const exercises = await prisma.exercise.findMany({
    where: {
      userId: session.user.id,
      isArchived: false,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      {/* Page heading */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-primary">YOUR TRAINING</p>

        <h1 className="text-3xl font-bold text-foreground">Exercise Library</h1>

        <p className="mt-2 text-muted-foreground">
          Your personal collection of exercises.
        </p>
        <div className="mt-5">
          <AddExerciseForm />
        </div>
      </div>

      {/* Exercise count */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">My Exercises</h2>

        <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </span>
      </div>

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Dumbbell size={26} />
          </div>

          <h3 className="text-lg font-semibold text-foreground">
            Your library is empty
          </h3>

          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            You haven't added any exercises yet. Your exercises will appear here
            once you start building your personal library.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {exercise.name}
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {exercise.category || "Uncategorized"}
                  </p>
                </div>

                <div className="rounded-lg bg-secondary p-2 text-primary">
                  <Dumbbell size={18} />
                </div>
              </div>

              {exercise.description && (
                <p className="mb-4 text-sm text-muted-foreground">
                  {exercise.description}
                </p>
              )}

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">Primary muscle:</span>{" "}
                  {exercise.primaryMuscle || "Not specified"}
                </p>

                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">Equipment:</span>{" "}
                  {exercise.equipment || "None specified"}
                </p>

                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">Tracking:</span>{" "}
                  {trackingLabels[exercise.trackingType]}
                </p>
              </div>

              {exercise.secondaryMuscles.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {exercise.secondaryMuscles.map((muscle) => (
                    <span
                      key={muscle}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t flex justify-between border-border pt-4">
                <EditExerciseForm exercise={exercise} />
                <DeleteExerciseButton
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default function LibraryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LibraryContent />
    </Suspense>
  );
}