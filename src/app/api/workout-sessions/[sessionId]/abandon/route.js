
import { NextResponse } from "next/server";

import { auth } from "../../../../../auth.js";
import { prisma } from "../../../../../lib/prisma.js";

export async function PATCH(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be signed in.",
        },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!workoutSession) {
      return NextResponse.json(
        {
          success: false,
          message: "Workout session not found.",
        },
        { status: 404 }
      );
    }

    if (workoutSession.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          success: false,
          message: "This workout is no longer in progress.",
        },
        { status: 409 }
      );
    }

    const updatedSession = await prisma.workoutSession.update({
      where: {
        id: workoutSession.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedEarly: true,
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
        completedEarly: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Workout finished successfully.",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Stop workout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not finish this workout.",
      },
      { status: 500 }
    );
  }
}
