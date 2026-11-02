
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { auth } from "../../../../auth.js";
import { prisma } from "../../../../lib/prisma.js";
import GuidedWorkout from "../../../../components/workouts/guided-workout.js";
import StopWorkoutButton from "../../../../components/workouts/stop-workout-button.js";

async function WorkoutSessionContent({ params }) {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { sessionId } = await params;

  const workoutSession = await prisma.workoutSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      status: "IN_PROGRESS",
    },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: {
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
      },
      workout: {
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: {
              exercise: true,
            },
          },
        },
      },
    },
  });

  if (!workoutSession) {
    notFound();
  }

  const guidedExercises = workoutSession.exercises.map((exercise) => {
    const target = workoutSession.workout?.exercises.find(
      (item) => item.exerciseId === exercise.exerciseId
    );

    return {
      id: exercise.id,
      exerciseName: exercise.exerciseName,
      order: exercise.order,

      trackingType: target?.exercise?.trackingType || "REPS_WEIGHT",

      targetSets: target?.targetSets ?? 1,
      targetRepsMin: target?.targetRepsMin ?? null,
      targetRepsMax: target?.targetRepsMax ?? null,
      targetWeight: target?.targetWeight?.toString() ?? "",
      targetDuration: target?.targetDuration ?? null,
      restSeconds: target?.restSeconds ?? null,

      sets: exercise.sets.map((set) => ({
        id: set.id,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight?.toString() ?? null,
        durationSeconds: set.durationSeconds,
        distance: set.distance?.toString() ?? null,
        isCompleted: set.isCompleted,
      })),
    };
  });

  return (
    <>
      <div className="mx-auto flex max-w-2xl justify-end px-6 pt-6 lg:px-10">
        <StopWorkoutButton sessionId={workoutSession.id} />
      </div>

      <GuidedWorkout
        sessionId={workoutSession.id}
        mode={workoutSession.mode}
        initialExercises={guidedExercises}
      />
    </>
  );
}

export default function WorkoutSessionPage({ params }) {
  return <WorkoutSessionContent params={params} />;
}
