
import { NextResponse } from "next/server";

import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";

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
    const {
      workoutId,
      mode = "FULL_SET",
      replaceExisting = false,
    } = body;

    if (!["FULL_SET", "CIRCUIT"].includes(mode)) {
      return NextResponse.json(
        { success: false, message: "Please select a valid workout mode." },
        { status: 400 }
      );
    }

    if (!workoutId || typeof workoutId !== "string") {
      return NextResponse.json(
        { success: false, message: "Please select a valid workout." },
        { status: 400 }
      );
    }

    if (typeof replaceExisting !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Invalid session option." },
        { status: 400 }
      );
    }

    const workout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        userId: session.user.id,
      },
      include: {
        exercises: {
          orderBy: {
            order: "asc",
          },
          include: {
            exercise: {
              select: {
                name: true,
                trackingType: true,
              },
            },
          },
        },
      },
    });

    if (!workout) {
      return NextResponse.json(
        { success: false, message: "Workout not found." },
        { status: 404 }
      );
    }

    if (workout.exercises.length === 0) {
      return NextResponse.json(
        { success: false, message: "This workout has no exercises." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Prevent simultaneous requests from creating duplicate sessions.
        const lockKey = `${session.user.id}:${workout.id}`;

        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${lockKey}, 0)
          )
        `;

        const existingSession = await tx.workoutSession.findFirst({
          where: {
            userId: session.user.id,
            workoutId: workout.id,
            status: "IN_PROGRESS",
          },
          orderBy: {
            startedAt: "desc",
          },
          select: {
            id: true,
          },
        });

        // Ask the user what to do if an unfinished session exists.
        if (existingSession && !replaceExisting) {
          return {
            existingSessionId: existingSession.id,
          };
        }

        // Start Fresh: abandon ALL unfinished sessions for this workout.
        if (existingSession && replaceExisting) {
          await tx.workoutSession.updateMany({
            where: {
              userId: session.user.id,
              workoutId: workout.id,
              status: "IN_PROGRESS",
            },
            data: {
              status: "ABANDONED",
            },
          });
        }

        // Create one new session.
        const newSession = await tx.workoutSession.create({
          data: {
            userId: session.user.id,
            workoutId: workout.id,
            name: workout.name,
            status: "IN_PROGRESS",
            mode,

            exercises: {
              create: workout.exercises.map((item) => ({
                exerciseId: item.exerciseId,
                exerciseName: item.exercise.name,
                order: item.order,
              })),
            },
          },
          include: {
            exercises: {
              orderBy: {
                order: "asc",
              },
            },
          },
        });

        return {
          session: newSession,
        };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    if (result.existingSessionId) {
      return NextResponse.json(
        {
          success: false,
          existingSessionId: result.existingSessionId,
          message: "You already have an unfinished session for this workout.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Workout session started.",
        session: result.session,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Start workout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not start workout.",
      },
      { status: 500 }
    );
  }
}
