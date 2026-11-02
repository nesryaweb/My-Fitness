
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";

const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  instructions: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(50).optional(),
  primaryMuscle: z.string().trim().max(50).optional(),
  secondaryMuscles: z.array(z.string().trim().min(1).max(50)).max(15).default([]),
  equipment: z.string().trim().max(100).optional(),
  trackingType: z.enum([
    "REPS_WEIGHT",
    "REPS_ONLY",
    "DURATION",
    "DISTANCE",
  ]),
});

export async function POST(request) {
  try {
    // Identify the logged-in user.
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    // Validate the submitted form data.
    const body = await request.json();
    const result = exerciseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check your exercise details.",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = result.data;

    // Save the exercise under the logged-in user's account.
    const exercise = await prisma.exercise.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description || null,
        instructions: data.instructions || null,
        category: data.category || null,
        primaryMuscle: data.primaryMuscle || null,
        secondaryMuscles: data.secondaryMuscles,
        equipment: data.equipment || null,
        trackingType: data.trackingType,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Exercise added successfully.",
        exercise,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create exercise error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while saving the exercise.",
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
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { success: false, message: "Exercise ID is required." },
        { status: 400 }
      );
    }

    const result = exerciseSchema.safeParse({
      name: body.name,
      description: body.description ?? "",
      instructions: body.instructions ?? "",
      category: body.category ?? "",
      primaryMuscle: body.primaryMuscle ?? "",
      secondaryMuscles: body.secondaryMuscles ?? [],
      equipment: body.equipment ?? "",
      trackingType: body.trackingType,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check your exercise details.",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Only update an exercise belonging to the logged-in user.
    const existingExercise = await prisma.exercise.findFirst({
      where: {
        id: body.id,
        userId: session.user.id,
      },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { success: false, message: "Exercise not found." },
        { status: 404 }
      );
    }

    const data = result.data;

    const exercise = await prisma.exercise.update({
      where: {
        id: existingExercise.id,
      },
      data: {
        name: data.name,
        description: data.description || null,
        instructions: data.instructions || null,
        category: data.category || null,
        primaryMuscle: data.primaryMuscle || null,
        secondaryMuscles: data.secondaryMuscles,
        equipment: data.equipment || null,
        trackingType: data.trackingType,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Exercise updated successfully.",
      exercise,
    });
  } catch (error) {
    console.error("Update exercise error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating the exercise.",
      },
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
        { success: false, message: "Exercise ID is required." },
        { status: 400 }
      );
    }

    // Confirm that this exercise belongs to the logged-in user.
    const existingExercise = await prisma.exercise.findFirst({
      where: {
        id: body.id,
        userId: session.user.id,
        isArchived: false,
      },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { success: false, message: "Exercise not found." },
        { status: 404 }
      );
    }

    // Archive instead of permanently deleting the record.
    await prisma.exercise.update({
      where: {
        id: existingExercise.id,
      },
      data: {
        isArchived: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Exercise removed from your library.",
    });
  } catch (error) {
    console.error("Archive exercise error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while removing the exercise.",
      },
      { status: 500 }
    );
  }
}
