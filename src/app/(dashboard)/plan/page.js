
import { Suspense } from "react";

import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma.js";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import WeeklyPlanContent from "../../../components/plan/weekly-plan-content.js";
import Loading from "../loading.js";

async function PlanContent() {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  let plan = await prisma.weeklyPlan.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      scheduledWorkouts: {
        include: {
          workout: {
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
          },
        },
        orderBy: {
          dayOfWeek: "asc",
        },
      },
    },
  });

  if (!plan) {
    plan = await prisma.weeklyPlan.create({
      data: {
        userId,
        name: "My Weekly Plan",
        isActive: true,
      },
      include: {
        scheduledWorkouts: {
          include: {
            workout: {
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
            },
          },
        },
      },
    });
  }

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const planForClient = {
    id: plan.id,
    name: plan.name,
    scheduledWorkouts: plan.scheduledWorkouts.map((item) => ({
      id: item.id,
      dayOfWeek: item.dayOfWeek,
      notes: item.notes,
      workout: {
        id: item.workout.id,
        name: item.workout.name,
        exercises: item.workout.exercises.map((exerciseItem) => ({
          id: exerciseItem.id,
          name: exerciseItem.exercise.name,
        })),
      },
    })),
  };

  return (
    <WeeklyPlanContent
      plan={planForClient}
      workouts={workouts}
    />
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PlanContent />
    </Suspense>
  );
}
