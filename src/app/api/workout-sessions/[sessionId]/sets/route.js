
import { NextResponse } from "next/server";


import { auth } from "../../../../../auth.js";
import { prisma } from "../../../../../lib/prisma.js";

export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const { sessionId } = await params;
    const body = await request.json();

    const {
      sessionExerciseId,
      setNumber,
      reps,
      weight,
      durationSeconds,
      distance,
      isCompleted,
      notes,
    } = body;

    if (
      !sessionExerciseId ||
      !Number.isInteger(setNumber) ||
      setNumber < 1
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid set information." },
        { status: 400 }
      );
    }

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: "IN_PROGRESS",
      },
    });

    if (!workoutSession) {
      return NextResponse.json(
        { success: false, message: "Active workout session not found." },
        { status: 404 }
      );
    }

    const exercise = await prisma.sessionExercise.findFirst({
      where: {
        id: sessionExerciseId,
        sessionId,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { success: false, message: "Exercise not found in this session." },
        { status: 404 }
      );
    }

    const validNumber = (value) =>
      value === null ||
      value === undefined ||
      (typeof value === "number" && Number.isFinite(value) && value >= 0);

    if (
      !validNumber(reps) ||
      !validNumber(weight) ||
      !validNumber(durationSeconds) ||
      !validNumber(distance) ||
      (reps != null && !Number.isInteger(reps)) ||
      (durationSeconds != null && !Number.isInteger(durationSeconds))
    ) {
      return NextResponse.json(
        { success: false, message: "Please enter valid set values." },
        { status: 400 }
      );
    }

    const savedSet = await prisma.sessionSet.upsert({
      where: {
        sessionExerciseId_setNumber: {
          sessionExerciseId,
          setNumber,
        },
      },
      update: {
        reps: reps ?? null,
        weight: weight ?? null,
        durationSeconds: durationSeconds ?? null,
        distance: distance ?? null,
        isCompleted: Boolean(isCompleted),
        notes: notes || null,
      },
      create: {
        sessionExerciseId,
        setNumber,
        reps: reps ?? null,
        weight: weight ?? null,
        durationSeconds: durationSeconds ?? null,
        distance: distance ?? null,
        isCompleted: Boolean(isCompleted),
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Set saved successfully.",
      set: savedSet,
    });
  } catch (error) {
    console.error("Save workout set error:", error);

    return NextResponse.json(
      { success: false, message: "Could not save set." },
      { status: 500 }
    );
  }
}
