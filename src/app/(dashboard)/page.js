
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import {
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  Sparkles,
  Target,
  Play,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

import { auth } from "../../auth.js";
import { prisma } from "../../lib/prisma.js";

import Loading from "./loading.js";

import StartWorkoutButton from "../../components/workouts/start-workout-button.js";

// Ethiopia uses UTC+3.
const ADDIS_OFFSET = 3 * 60 * 60 * 1000;

function getAddisDate(date) {
  return new Date(new Date(date).getTime() + ADDIS_OFFSET);
}

function getDateKey(date) {
  const addisDate = getAddisDate(date);

  return [
    addisDate.getUTCFullYear(),
    String(addisDate.getUTCMonth() + 1).padStart(2, "0"),
    String(addisDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getCurrentWeek(addisNow) {
  const dayOfWeek = addisNow.getUTCDay();

  const startOfWeekAddis = new Date(
    Date.UTC(
      addisNow.getUTCFullYear(),
      addisNow.getUTCMonth(),
      addisNow.getUTCDate() - dayOfWeek
    )
  );

  const endOfWeekAddis = new Date(
    startOfWeekAddis.getTime() + 7 * 24 * 60 * 60 * 1000
  );

  return {
    start: new Date(startOfWeekAddis.getTime() - ADDIS_OFFSET),
    end: new Date(endOfWeekAddis.getTime() - ADDIS_OFFSET),
    startOfWeekAddis,
  };
}

function calculateStreak(dateKeys, todayKey) {
  if (dateKeys.size === 0) return 0;

  const cursor = new Date(`${todayKey}T00:00:00Z`);

  // If there was no workout today, allow the streak to continue
  // from yesterday.
  if (!dateKeys.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;

  while (true) {
    const key = [
      cursor.getUTCFullYear(),
      String(cursor.getUTCMonth() + 1).padStart(2, "0"),
      String(cursor.getUTCDate()).padStart(2, "0"),
    ].join("-");

    if (!dateKeys.has(key)) break;

    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

async function DashboardData() {
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const now = new Date();
  const addisNow = getAddisDate(now);

  const todayKey = getDateKey(now);
  const todayDayOfWeek = addisNow.getUTCDay();

  const { start, end, startOfWeekAddis } =
    getCurrentWeek(addisNow);

  // Get completed workout sessions and today's scheduled workout.
  const [workoutSessions, weeklyPlan] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
      orderBy: {
        completedAt: "desc",
      },
    }),

    prisma.weeklyPlan.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        scheduledWorkouts: {
          where: {
            dayOfWeek: todayDayOfWeek,
          },
          include: {
            workout: {
              include: {
                exercises: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Only include workouts completed during the current week.
  const thisWeekWorkouts = workoutSessions.filter((workout) => {
    const completedAt = new Date(workout.completedAt);

    return completedAt >= start && completedAt < end;
  });

  const workoutsThisWeek = thisWeekWorkouts.length;

  // Calculate total training minutes this week.
  const activeSeconds = thisWeekWorkouts.reduce(
    (total, workout) => {
      const duration =
        new Date(workout.completedAt).getTime() -
        new Date(workout.startedAt).getTime();

      return total + Math.max(0, duration / 1000);
    },
    0
  );

  const activeMinutes = Math.floor(activeSeconds / 60);

  // Calculate completed workout days.
  const allWorkoutDays = new Set(
    workoutSessions.map((workout) =>
      getDateKey(workout.completedAt)
    )
  );

  const currentStreak = calculateStreak(
    allWorkoutDays,
    todayKey
  );

  // Weekly goal is currently five workouts.
  const weeklyGoal = 5;

  const weeklyPercentage = Math.min(
    100,
    Math.round((workoutsThisWeek / weeklyGoal) * 100)
  );

  // Prepare the seven days of the current week.
  const weeklyActivity = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(
        startOfWeekAddis.getTime() +
          index * 24 * 60 * 60 * 1000
      );

      const key = [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
      ].join("-");

      const dayNames = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
      ];

      return {
        day: dayNames[index],
        date: key,
        completed: allWorkoutDays.has(key),
      };
    }
  );

  // Find today's scheduled workout.
  const todayWorkout =
    weeklyPlan?.scheduledWorkouts?.[0]?.workout ?? null;

  const todayExerciseCount =
    todayWorkout?.exercises?.length ?? 0;

  const stats = [
    {
      title: "Workouts this week",
      value: String(workoutsThisWeek),
      description:
        `${Math.max(0, weeklyGoal - workoutsThisWeek)} more to reach your goal`,
      icon: Dumbbell,
    },
    {
      title: "Active minutes",
      value: String(activeMinutes),
      description: "This week's training",
      icon: Clock3,
    },
    {
      title: "Current streak",
      value: `${currentStreak} ${currentStreak === 1 ? "day" : "days"}`,
      description: "Keep showing up!",
      icon: Flame,
    },
    {
      title: "Weekly goal",
      value: `${weeklyPercentage}%`,
      description: `${workoutsThisWeek} of ${weeklyGoal} workouts`,
      icon: Target,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 p-4 sm:p-6 lg:space-y-9 lg:p-8">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-primary">
            YOUR PERSONAL FITNESS SPACE
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Hello, beautiful! <span className="text-primary">♡</span>
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Every little effort counts. Let's make today meaningful.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm">
          <CalendarDays size={17} className="text-primary" />
          Today's overview
        </div>
      </header>

      {/* Today's workout and reminder */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)]">
        {/* Main workout card */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="grid h-full md:grid-cols-[minmax(0,1fr)_220px]">
            <CardContent className="flex flex-col items-start p-5 sm:p-7 lg:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles size={14} />
                {todayWorkout
                  ? "SCHEDULED WORKOUT"
                  : "TODAY'S PLAN"}
              </div>

              {todayWorkout ? (
                <>
                  <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                    {todayWorkout.name}
                  </h2>

                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {todayWorkout.description ||
                      "Your scheduled workout is ready. Take it one exercise at a time."}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Dumbbell size={17} className="text-primary" />
                      {todayExerciseCount}{" "}
                      {todayExerciseCount === 1
                        ? "exercise"
                        : "exercises"}
                    </span>
                  </div>

                  <div className="mt-7">
                    <StartWorkoutButton workoutId={todayWorkout.id} />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                    No workout scheduled today
                  </h2>

                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    You can choose a workout from your library or
                    organize your training schedule for the week.
                  </p>

                  <Link
                    href="/workouts"
                    className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    <Dumbbell size={16} />
                    Browse workouts
                  </Link>
                </>
              )}
            </CardContent>

            {/* Decorative visual */}
            <div className="flex h-full w-[90%] items-center justify-center rounded-full bg-secondary/60 p-8">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <Heart
                  size={55}
                  strokeWidth={1.3}
                  className="animate-[heartbeat_1.3s_ease-in-out_infinite]"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Encouraging reminder */}
        <Card className="flex flex-col justify-center border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Sparkles size={21} />
            </div>

            <CardTitle className="text-base">
              A little reminder
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl bg-secondary/60 p-5 sm:p-6">
              <p className="text-xl font-bold leading-snug tracking-tight">
                You don't have to start over.
              </p>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A missed day isn't a failed journey. A setback doesn't
                erase your progress. Pick up where you left off and
                keep going.
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
                <Heart size={15} />
                Keep going. You're still making progress.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Progress statistics */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Your progress</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A little progress adds up over time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Card key={stat.title} className="border-border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-2xl font-bold tracking-tight">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Weekly activity */}
      <section>
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Your weekly activity
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Your consistency matters more than perfection.
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-7 gap-2 sm:gap-4">
              {weeklyActivity.map((item) => (
                <div
                  key={item.day}
                  className="flex flex-col items-center gap-3"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.day}
                  </span>

                  <div
                    title={
                      item.completed
                        ? "Workout completed"
                        : "No completed workout"
                    }
                    className={`flex aspect-square w-full max-w-14 items-center justify-center rounded-xl transition-colors ${
                      item.completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.completed ? (
                      <Heart
                        size={18}
                        fill="currentColor"
                        className="sm:h-5 sm:w-5"
                      />
                    ) : (
                      <span className="text-sm">–</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardData />
    </Suspense>
  );
}
