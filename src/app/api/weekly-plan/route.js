
import { NextResponse } from "next/server";
import { auth } from "../../../auth.js";
import { prisma } from "../../../lib/prisma.js";
import { z } from "zod";

// Validate data when adding a workout.
const scheduleSchema = z.object({
  workoutId: z.string().min(1, "Workout is required."),
  dayOfWeeks: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one day."),
  notes: z.string().optional(),
});

// Validate data when updating a workout's scheduled days.
const updateSchema = z.object({
  id: z.string().min(1, "Schedule ID is required."),
  dayOfWeeks: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one day."),
});

// GET: Load the user's weekly plan.
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    let weeklyPlan = await prisma.weeklyPlan.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        scheduledWorkouts: {
          include: {
            workout: {
              include: {
                exercises: true,
              },
            },
          },
        },
      },
    });

    if (!weeklyPlan) {
      weeklyPlan = await prisma.weeklyPlan.create({
        data: {
          userId: session.user.id,
          isActive: true,
        },
        include: {
          scheduledWorkouts: {
            include: {
              workout: {
                include: {
                  exercises: true,
                },
              },
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      weeklyPlan,
    });
  } catch (error) {
    console.error("Get weekly plan error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not load your weekly plan.",
      },
      { status: 500 }
    );
  }
}

// POST: Add a workout to selected days.
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
    const result = scheduleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a workout and at least one day.",
        },
        { status: 400 }
      );
    }

    const { workoutId, dayOfWeeks, notes } = result.data;
    const userId = session.user.id;

    // Confirm that this workout belongs to the logged-in user.
    const workout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        userId,
      },
    });

    if (!workout) {
      return NextResponse.json(
        {
          success: false,
          message: "Workout not found.",
        },
        { status: 404 }
      );
    }

    // Find or create the user's active weekly plan.
    let weeklyPlan = await prisma.weeklyPlan.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!weeklyPlan) {
      weeklyPlan = await prisma.weeklyPlan.create({
        data: {
          userId,
          isActive: true,
        },
      });
    }

    const selectedDays = [...new Set(dayOfWeeks)];

    const scheduledWorkouts = await prisma.$transaction(
      async (tx) => {
        const createdEntries = [];

        for (const dayOfWeek of selectedDays) {
          const created = await tx.scheduledWorkout.create({
            data: {
              weeklyPlanId: weeklyPlan.id,
              workoutId,
              dayOfWeek,
              notes,
            },
            include: {
              workout: true,
            },
          });

          createdEntries.push(created);
        }

        return createdEntries;
      }
    );

    return NextResponse.json({
      success: true,
      message: `Workout added to ${scheduledWorkouts.length} days.`,
      scheduledWorkouts,
    });
  } catch (error) {
    console.error("Add scheduled workout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not add this workout.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Replace all scheduled days for this workout.
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
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Select at least one training day.",
        },
        { status: 400 }
      );
    }

    const { id, dayOfWeeks } = result.data;
    const userId = session.user.id;

    const updatedWorkouts = await prisma.$transaction(
      async (tx) => {
        const original = await tx.scheduledWorkout.findFirst({
          where: {
            id,
            weeklyPlan: {
              userId,
              isActive: true,
            },
          },
        });

        if (!original) {
          throw new Error("SCHEDULE_NOT_FOUND");
        }

        const selectedDays = [...new Set(dayOfWeeks)];

        // Remove every scheduled entry for this workout
        // in this weekly plan.
        await tx.scheduledWorkout.deleteMany({
          where: {
            weeklyPlanId: original.weeklyPlanId,
            workoutId: original.workoutId,
          },
        });

        // Recreate exactly the selected days.
        const createdEntries = [];

        for (const dayOfWeek of selectedDays) {
          const created = await tx.scheduledWorkout.create({
            data: {
              weeklyPlanId: original.weeklyPlanId,
              workoutId: original.workoutId,
              dayOfWeek,
              notes: original.notes,
            },
            include: {
              workout: true,
            },
          });

          createdEntries.push(created);
        }

        return {
          workoutId: original.workoutId,
          scheduledWorkouts: createdEntries,
        };
      }
    );

    return NextResponse.json({
      success: true,
      message: `Workout scheduled on ${updatedWorkouts.scheduledWorkouts.length} days.`,
      workoutId: updatedWorkouts.workoutId,
      scheduledWorkouts: updatedWorkouts.scheduledWorkouts,
      savedDays: updatedWorkouts.scheduledWorkouts.map(
        (item) => item.dayOfWeek
      ),
    });
  } catch (error) {
    if (error.message === "SCHEDULE_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          message: "Scheduled workout not found.",
        },
        { status: 404 }
      );
    }

    console.error("Update scheduled workout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not update this workout.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove one scheduled entry.
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

    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json(
        { success: false, message: "Invalid schedule ID." },
        { status: 400 }
      );
    }

    const scheduledWorkout = await prisma.scheduledWorkout.findFirst({
      where: {
        id: body.id,
        weeklyPlan: {
          userId: session.user.id,
          isActive: true,
        },
      },
    });

    if (!scheduledWorkout) {
      return NextResponse.json(
        {
          success: false,
          message: "Scheduled workout not found.",
        },
        { status: 404 }
      );
    }

    await prisma.scheduledWorkout.delete({
      where: {
        id: scheduledWorkout.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Workout removed from your weekly plan.",
    });
  } catch (error) {
    console.error("Remove scheduled workout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not remove this workout.",
      },
      { status: 500 }
    );
  }
}
