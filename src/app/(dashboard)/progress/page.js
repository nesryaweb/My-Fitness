
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";
import Loading from "../loading.js";
import ProgressContent from "../../../components/progress/progress-content.js";

async function ProgressData() {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [workoutSessions, bodyMeasurements] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { not: null },
      },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: {
            sets: {
              where: { isCompleted: true },
              orderBy: { setNumber: "asc" },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    }),

    prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { recordedAt: "asc" },
    }),
  ]);

  // Total completed workouts
  const completedWorkouts = workoutSessions.length;

  // Total completed sets
  const completedSets = workoutSessions.reduce(
    (total, workout) =>
      total +
      workout.exercises.reduce(
        (exerciseTotal, exercise) =>
          exerciseTotal + exercise.sets.length,
        0
      ),
    0
  );

  // Count unique workout days using Addis Ababa time (UTC+3)
  const activeDays = new Set(
    workoutSessions.map((workout) => {
      const addisDate = new Date(
        new Date(workout.completedAt).getTime() +
          3 * 60 * 60 * 1000
      );

      return [
        addisDate.getUTCFullYear(),
        String(addisDate.getUTCMonth() + 1).padStart(2, "0"),
        String(addisDate.getUTCDate()).padStart(2, "0"),
      ].join("-");
    })
  ).size;

  // Calculate total workout duration
  const totalDurationSeconds = workoutSessions.reduce(
    (total, workout) => {
      const duration =
        new Date(workout.completedAt).getTime() -
        new Date(workout.startedAt).getTime();

      return total + Math.max(0, duration / 1000);
    },
    0
  );

  // Prepare workout data for the Progress page
  const progressWorkouts = workoutSessions.map((workout) => ({
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt.toISOString(),
    completedAt: workout.completedAt.toISOString(),

    durationSeconds: Math.max(
      0,
      Math.round(
        (new Date(workout.completedAt).getTime() -
          new Date(workout.startedAt).getTime()) /
          1000
      )
    ),

    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.exerciseName,

      sets: exercise.sets.map((set) => ({
        id: set.id,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight === null ? null : Number(set.weight),
        durationSeconds: set.durationSeconds,
        distance: set.distance === null ? null : Number(set.distance),
      })),
    })),
  }));

  // Prepare body measurement data
  const progressMeasurements = bodyMeasurements.map((measurement) => ({
    id: measurement.id,
    type: measurement.type,
    value: Number(measurement.value),
    unit: measurement.unit,
    recordedAt: measurement.recordedAt.toISOString(),
  }));

  const progressData = {
    stats: {
      completedWorkouts,
      completedSets,
      activeDays,
      totalDurationSeconds,
    },

    workouts: progressWorkouts,
    measurements: progressMeasurements,
  };

  return <ProgressContent data={progressData} />;
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProgressData />
    </Suspense>
  );
}
