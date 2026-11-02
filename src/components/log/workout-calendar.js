
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  CalendarCheck,
  Layers,
} from "lucide-react";

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function WorkoutCalendar({ workouts }) {
  const router = useRouter();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Group completed workouts by date.
  const workoutsByDate = useMemo(() => {
    const grouped = {};

    workouts.forEach((workout) => {
      if (!workout.completedAt) return;

      const dateKey = getDateKey(new Date(workout.completedAt));

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(workout);
    });

    // Most recently completed workout first.
    Object.values(grouped).forEach((dayWorkouts) => {
      dayWorkouts.sort(
        (a, b) =>
          new Date(b.completedAt) - new Date(a.completedAt)
      );
    });

    return grouped;
  }, [workouts]);

  // Workouts completed in the selected month.
  const monthWorkouts = workouts.filter((workout) => {
    if (!workout.completedAt) return false;

    const date = new Date(workout.completedAt);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
  });

  // Count unique days with completed workouts.
  const activeDays = Object.keys(workoutsByDate).filter((dateKey) => {
    const date = new Date(`${dateKey}T12:00:00`);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
  }).length;

  // Total completed sets across all workouts this month.
  const totalSets = monthWorkouts.reduce(
    (total, workout) => total + (workout.completedSetCount || 0),
    0
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isCurrentMonth =
    year === today.getFullYear() &&
    month === today.getMonth();

  const isFutureMonth =
    new Date(year, month, 1) >
    new Date(today.getFullYear(), today.getMonth(), 1);

  // Monday-first calendar.
  const firstDay = new Date(year, month, 1);
  const startingDay = (firstDay.getDay() + 6) % 7;

  const calendarDays = [
    ...Array(startingDay).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => index + 1
    ),
  ];

  function changeMonth(direction) {
    setCurrentMonth(new Date(year, month + direction, 1));
  }

  function openWorkout(dateKey) {
    const dayWorkouts = workoutsByDate[dateKey];

    if (dayWorkouts?.length) {
      router.push(`/log/${dayWorkouts[0].id}`);
    }
  }

  return (
    <section className="w-full rounded-2xl border border-border bg-card p-4 md:p-5">

      {/* Main heading */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold">
          Monthly activity
        </h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Your training at a glance
        </p>
      </div>

      {/* Calendar and monthly overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">

        {/* Calendar */}
        <div className="min-w-0">

          {/* Calendar heading and month navigation */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              Workout calendar
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-muted"
              >
                <ChevronLeft size={16} />
              </button>

              <h4 className="min-w-32 text-center text-sm font-medium">
                {currentMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h4>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                disabled={isCurrentMonth || isFutureMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar dates */}
          <div className="mx-auto w-full max-w-[390px]">
            <div className="grid grid-cols-7 gap-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (day, index) => (
                  <div
                    key={`${day}-${index}`}
                    className="pb-1 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                )
              )}

              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} />;
                }

                const date = new Date(year, month, day);
                const dateKey = getDateKey(date);

                const hasWorkout = Boolean(
                  workoutsByDate[dateKey]?.length
                );

                const isToday = dateKey === getDateKey(today);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => openWorkout(dateKey)}
                    disabled={!hasWorkout}
                    aria-label={
                      `${date.toDateString()}` +
                      (hasWorkout
                        ? ", workout completed. Open workout details."
                        : ", no completed workout")
                    }
                    title={
                      hasWorkout
                        ? "View completed workout"
                        : "No completed workout"
                    }
                    className={`flex aspect-square w-full items-center justify-center rounded-md border text-xs transition ${
                      hasWorkout
                        ? "border-transparent bg-primary text-primary-foreground hover:opacity-80"
                        : "cursor-default border-transparent bg-muted/50 text-muted-foreground"
                    } ${
                      isToday
                        ? "ring-1 ring-primary ring-offset-1 ring-offset-card"
                        : ""
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted/50" />
              <span className="text-[11px] text-muted-foreground">
                No workout
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
              <span className="text-[11px] text-muted-foreground">
                Workout completed
              </span>
            </div>
          </div>
        </div>

        {/* Monthly overview */}
        <div className="min-w-0 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 className="mb-4 text-sm font-semibold">
            Monthly overview
          </h3>

          <div className="grid grid-cols-2 gap-3">

            {/* Completed workouts */}
            <div className="rounded-xl bg-secondary p-3.5">
              <Dumbbell
                size={17}
                className="mb-2.5 text-primary"
              />

              <p className="text-2xl font-semibold tabular-nums">
                {monthWorkouts.length}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Completed workouts
              </p>
            </div>

            {/* Active days */}
            <div className="rounded-xl bg-secondary p-3.5">
              <CalendarCheck
                size={17}
                className="mb-2.5 text-primary"
              />

              <p className="text-2xl font-semibold tabular-nums">
                {activeDays}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Active days
              </p>
            </div>

            {/* Total completed sets */}
            <div className="col-span-2 rounded-xl bg-secondary p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {totalSets}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Total sets completed
                  </p>
                </div>

                <Layers
                  size={20}
                  className="text-primary"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
