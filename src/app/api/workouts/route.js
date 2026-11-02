
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";

const workoutSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string().min(1),
      targetSets: z.number().int().positive().optional(),
      targetRepsMin: z.number().int().positive().optional(),
      targetRepsMax: z.number().int().positive().optional(),
      targetWeight: z.number().nonnegative().optional(),
      targetDuration: z.number().int().positive().optional(),
      restSeconds: z.number().int().nonnegative().optional(),
      notes: z.string().trim().max(1000).optional(),
    })
  ).min(1),
});

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = workoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check your workout details.",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = result.data;
    const userId = session.user.id;

    // Prevent duplicate exercise selections.
    const exerciseIds = data.exercises.map(
      (item) => item.exerciseId
    );

    if (new Set(exerciseIds).size !== exerciseIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "An exercise cannot be added twice to the same workout.",
        },
        { status: 400 }
      );
    }

    // Verify that every selected exercise belongs to this user.
    const ownedExercises = await prisma.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        userId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (ownedExercises.length !== exerciseIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more selected exercises are unavailable.",
        },
        { status: 400 }
      );
    }

    // Create the workout and its exercises together.
    const workout = await prisma.workout.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        exercises: {
          create: data.exercises.map((item, index) => ({
            exerciseId: item.exerciseId,
            order: index,
            targetSets: item.targetSets ?? null,
            targetRepsMin: item.targetRepsMin ?? null,
            targetRepsMax: item.targetRepsMax ?? null,
            targetWeight: item.targetWeight ?? null,
            targetDuration: item.targetDuration ?? null,
            restSeconds: item.restSeconds ?? null,
            notes: item.notes || null,
          })),
        },
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
    });

    return NextResponse.json(
      {
        success: true,
        message: "Workout created successfully.",
        workout,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create workout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating the workout.",
      },
      { status: 500 }
    );
  }
}
export async function PATCH(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const schema = z.object({
      id: z.string().min(1),
      name: z.string().trim().min(2).max(100),
      description: z.string().trim().max(1000).optional(),
      exercises: z.array(
        z.object({
          exerciseId: z.string().min(1),
          targetSets: z.number().int().positive().optional(),
          targetRepsMin: z.number().int().positive().optional(),
          targetRepsMax: z.number().int().positive().optional(),
          targetWeight: z.number().positive().optional(),
          targetDuration: z.number().int().positive().optional(),
          restSeconds: z.number().int().nonnegative().optional(),
          notes: z.string().max(500).optional(),
        })
      ).min(1),
    });

    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: "Please check your workout details." },
        { status: 400 }
      );
    }

    const { id, name, description, exercises } = result.data;

    const workout = await prisma.workout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!workout) {
      return NextResponse.json(
        { success: false, message: "Workout not found." },
        { status: 404 }
      );
    }

    const exerciseIds = exercises.map((item) => item.exerciseId);

    if (new Set(exerciseIds).size !== exerciseIds.length) {
      return NextResponse.json(
        { success: false, message: "An exercise cannot be added twice." },
        { status: 400 }
      );
    }

    const ownedExercises = await prisma.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        userId: session.user.id,
        isArchived: false,
      },
      select: { id: true },
    });

    if (ownedExercises.length !== exerciseIds.length) {
      return NextResponse.json(
        { success: false, message: "One or more exercises are invalid." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.workout.update({
        where: { id },
        data: {
          name,
          description: description || null,
        },
      });

      await tx.workoutExercise.deleteMany({
        where: { workoutId: id },
      });

      await tx.workoutExercise.createMany({
        data: exercises.map((item, index) => ({
          workoutId: id,
          exerciseId: item.exerciseId,
          order: index,
          targetSets: item.targetSets,
          targetRepsMin: item.targetRepsMin,
          targetRepsMax: item.targetRepsMax,
          targetWeight: item.targetWeight,
          targetDuration: item.targetDuration,
          restSeconds: item.restSeconds,
          notes: item.notes,
        })),
      });
    });

    return NextResponse.json({
      success: true,
      message: "Workout updated successfully.",
    });
  } catch (error) {
    console.error("Update workout error:", error);

    return NextResponse.json(
      { success: false, message: "Could not update workout." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid workout ID." },
        { status: 400 }
      );
    }

    // Make sure this workout belongs to the logged-in user.
    const workout = await prisma.workout.findFirst({
      where: {
        id: body.id,
        userId: session.user.id,
      },
    });

    if (!workout) {
      return NextResponse.json(
        { success: false, message: "Workout not found." },
        { status: 404 }
      );
    }

    // Delete the workout and its exercise entries together.
    await prisma.$transaction(async (tx) => {
      await tx.workoutExercise.deleteMany({
        where: {
          workoutId: workout.id,
        },
      });

      await tx.workout.delete({
        where: {
          id: workout.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Workout deleted successfully.",
    });
  } catch (error) {
    console.error("Delete workout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not delete workout.",
      },
      { status: 500 }
    );
  }
}