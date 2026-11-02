
"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Clock3,
  TrendingUp,
  Scale,
  Ruler,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const metricDetails = {
  WEIGHT: { label: "Weight", unit: "kg", icon: Scale },
  HEIGHT: { label: "Height", unit: "cm", icon: Ruler },
  WAIST: { label: "Waist", unit: "cm", icon: Activity },
  HIPS: { label: "Hips", unit: "cm", icon: Activity },
  CHEST: { label: "Chest", unit: "cm", icon: Activity },
  ARM: { label: "Arm", unit: "cm", icon: Activity },
  THIGH: { label: "Thigh", unit: "cm", icon: Activity },
  BODY_FAT: { label: "Body fat", unit: "%", icon: Activity },
};

// All date formatting is manual and deterministic.
// We use UTC+3 for Addis Ababa instead of browser/server locale settings.
function getAddisDateParts(date) {
  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp)) {
    return { day: 1, month: "Jan", monthIndex: 0, year: 2026 };
  }

  const shiftedDate = new Date(
    timestamp + 3 * 60 * 60 * 1000
  );

  return {
    day: shiftedDate.getUTCDate(),
    month: MONTH_NAMES[shiftedDate.getUTCMonth()],
    monthIndex: shiftedDate.getUTCMonth(),
    year: shiftedDate.getUTCFullYear(),
  };
}

function formatDate(date) {
  const parts = getAddisDateParts(date);
  return `${parts.day} ${parts.month} ${parts.year}`;
}

function formatShortDate(date) {
  const parts = getAddisDateParts(date);
  return `${parts.month} ${parts.day}`;
}

function getAddisDateKey(date) {
  const parts = getAddisDateParts(date);

  return [
    parts.year,
    String(parts.monthIndex + 1).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function formatNumber(value) {
  return Number(value).toLocaleString("en", {
    maximumFractionDigits: 1,
  });
}

function formatDuration(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
}

function MeasurementChart({ measurements, type }) {
  const metric = metricDetails[type];

  const points = useMemo(() => {
    const records = measurements
      .filter((item) => item.type === type)
      .sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() -
          new Date(b.recordedAt).getTime()
      )
      .slice(-12);

    if (!records.length) return [];

    const values = records.map((item) => item.value);

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
      min -= Math.max(min * 0.05, 1);
      max += Math.max(max * 0.05, 1);
    }

    const range = max - min;
    const width = 600;
    const height = 220;
    const left = 55;
    const right = 20;
    const top = 25;
    const bottom = 35;

    return records.map((record, index) => ({
      ...record,
      x:
        records.length === 1
          ? width / 2
          : left +
            (index / (records.length - 1)) *
              (width - left - right),
      y:
        top +
        ((max - record.value) / range) *
          (height - top - bottom),
    }));
  }, [measurements, type]);

  if (!points.length) return null;

  const latest = points[points.length - 1];

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Latest {metric.label.toLowerCase()}
        </p>

        <p className="mt-1 text-3xl font-bold tabular-nums">
          {formatNumber(latest.value)}
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {metric.unit}
          </span>
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          Recorded {formatDate(latest.recordedAt)}
        </p>
      </div>

      {points.length === 1 ? (
        <div className="rounded-xl bg-muted/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Record another {metric.label.toLowerCase()} measurement
            to see how it changes over time.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <svg
            viewBox="0 0 600 220"
            className="h-auto w-full"
            role="img"
            aria-label={`${metric.label} progress chart`}
          >
            {[0, 1, 2, 3].map((index) => {
              const y = 25 + (index / 3) * 160;

              return (
                <line
                  key={index}
                  x1="55"
                  y1={y}
                  x2="580"
                  y2={y}
                  stroke="currentColor"
                  opacity="0.12"
                  strokeDasharray="4 5"
                />
              );
            })}

            <polyline
              points={points
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point) => (
              <circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="var(--primary)"
                stroke="var(--card)"
                strokeWidth="2"
              >
                <title>
                  {`${formatDate(point.recordedAt)}: ${formatNumber(
                    point.value
                  )} ${metric.unit}`}
                </title>
              </circle>
            ))}

            {[0, Math.floor((points.length - 1) / 2), points.length - 1]
              .filter(
                (value, index, array) =>
                  array.indexOf(value) === index
              )
              .map((index) => (
                <text
                  key={index}
                  x={points[index].x}
                  y="210"
                  textAnchor="middle"
                  fill="currentColor"
                  opacity="0.6"
                  fontSize="12"
                >
                  {formatShortDate(points[index].recordedAt)}
                </text>
              ))}
          </svg>
        </div>
      )}
    </div>
  );
}

function WorkoutCalendar({ workouts }) {
  // Use the current UTC month as the initial month.
  // UTC is consistent between the server and browser.
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();

    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth(),
    };
  });

  const workoutDates = useMemo(() => {
    const dates = {};

    for (const workout of workouts) {
      const key = getAddisDateKey(workout.completedAt);
      dates[key] = (dates[key] || 0) + 1;
    }

    return dates;
  }, [workouts]);

  const { year, month } = currentMonth;

  const firstDay = new Date(
    Date.UTC(year, month, 1)
  ).getUTCDay();

  const daysInMonth = new Date(
    Date.UTC(year, month + 1, 0)
  ).getUTCDate();

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function changeMonth(amount) {
    const next = new Date(
      Date.UTC(year, month + amount, 1)
    );

    setCurrentMonth({
      year: next.getUTCFullYear(),
      month: next.getUTCMonth(),
    });
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonthIndex = now.getUTCMonth();

  const isCurrentMonth =
    year === currentYear && month === currentMonthIndex;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Workout activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Days you completed a workout
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="min-w-24 text-center text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </span>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
          (day) => (
            <span
              key={day}
              className="pb-2 text-xs font-medium text-muted-foreground"
            >
              {day}
            </span>
          )
        )}

        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const key = [
            year,
            String(month + 1).padStart(2, "0"),
            String(day).padStart(2, "0"),
          ].join("-");

          const count = workoutDates[key] || 0;

          return (
            <div
              key={key}
              title={
                count
                  ? `${count} completed workout${
                      count > 1 ? "s" : ""
                    }`
                  : "No completed workout"
              }
              className={`flex aspect-square items-center justify-center rounded-lg text-xs ${
                count
                  ? "bg-primary font-bold text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{workouts.length} completed workouts total</span>
        <span>{Object.keys(workoutDates).length} active days</span>
      </div>
    </section>
  );
}

function ExerciseProgress({ workouts }) {
  const [selectedExercise, setSelectedExercise] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("weight");

  const exerciseOptions = useMemo(() => {
    const exercises = new Set();

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        exercises.add(exercise.name);
      });
    });

    return [...exercises].sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  const activeExercise = exerciseOptions.includes(selectedExercise)
    ? selectedExercise
    : exerciseOptions[0] || "";

  const history = useMemo(() => {
    if (!activeExercise) return [];

    return workouts
      .filter((workout) =>
        workout.exercises.some(
          (exercise) => exercise.name === activeExercise
        )
      )
      .map((workout) => {
        const exercise = workout.exercises.find(
          (item) => item.name === activeExercise
        );

        const sets = exercise.sets;

        const weights = sets
          .map((set) => set.weight)
          .filter((value) => value !== null);

        const reps = sets
          .map((set) => set.reps)
          .filter((value) => value !== null);

        return {
          id: workout.id,
          date: workout.completedAt,
          weight: weights.length ? Math.max(...weights) : null,
          reps: reps.length ? Math.max(...reps) : null,
          setCount: sets.length,
        };
      })
      .filter((item) =>
        selectedMetric === "weight"
          ? item.weight !== null
          : item.reps !== null
      )
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );
  }, [workouts, activeExercise, selectedMetric]);

  const values = history.map((item) => item[selectedMetric]);

  const latestValue = values.length
    ? values[values.length - 1]
    : null;

  const previousValue =
    values.length > 1 ? values[values.length - 2] : null;

  const change =
    latestValue !== null && previousValue !== null
      ? latestValue - previousValue
      : null;

  if (exerciseOptions.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">Exercise performance</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete workouts with recorded sets to see your exercise
          performance here.
        </p>
      </section>
    );
  }

  const chartWidth = 600;
  const chartHeight = 230;
  const left = 45;
  const right = 20;
  const top = 20;
  const bottom = 40;

  let min = values.length ? Math.min(...values) : 0;
  let max = values.length ? Math.max(...values) : 0;

  if (min === max) {
    min = Math.max(0, min - 1);
    max += 1;
  }

  const range = max - min;

  const points = history.map((item, index) => ({
    ...item,
    value: item[selectedMetric],
    x:
      history.length === 1
        ? chartWidth / 2
        : left +
          (index / (history.length - 1)) *
            (chartWidth - left - right),
    y:
      top +
      ((max - item[selectedMetric]) / range) *
        (chartHeight - top - bottom),
  }));

  const unit = selectedMetric === "weight" ? "kg" : "reps";

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5">
        <h2 className="font-bold">Exercise performance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          See how your performance changes across completed workouts.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="progress-exercise"
            className="mb-2 block text-xs font-medium text-muted-foreground"
          >
            Select exercise
          </label>

          <select
            id="progress-exercise"
            value={activeExercise}
            onChange={(event) =>
              setSelectedExercise(event.target.value)
            }
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {exerciseOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium text-muted-foreground">
            Track performance
          </span>

          <div className="flex h-11 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setSelectedMetric("weight")}
              className={`flex-1 rounded-lg text-sm font-semibold transition ${
                selectedMetric === "weight"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weight
            </button>

            <button
              type="button"
              onClick={() => setSelectedMetric("reps")}
              className={`flex-1 rounded-lg text-sm font-semibold transition ${
                selectedMetric === "reps"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Repetitions
            </button>
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl bg-muted/40 px-5 py-10 text-center">
          <Activity
            size={28}
            className="mx-auto text-muted-foreground"
          />

          <p className="mt-3 font-semibold">
            No {selectedMetric === "weight" ? "weight" : "repetition"}{" "}
            data yet
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Complete this exercise with recorded{" "}
            {selectedMetric === "weight"
              ? "weights"
              : "repetitions"}{" "}
            to see its progress.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Latest recorded best {selectedMetric}
              </p>

              <p className="mt-1 text-3xl font-bold tabular-nums">
                {formatNumber(latestValue)}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {unit}
                </span>
              </p>
            </div>

            {change !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Change from previous workout
                </p>

                <p
                  className={`mt-1 text-sm font-bold ${
                    change > 0
                      ? "text-green-500"
                      : change < 0
                        ? "text-rose-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {change > 0 ? "+" : ""}
                  {formatNumber(change)} {unit}
                </p>
              </div>
            )}
          </div>

          {points.length === 1 ? (
            <div className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              Complete this exercise in another workout to compare
              your performance.
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <svg
                viewBox="0 0 600 230"
                className="h-auto w-full"
                role="img"
                aria-label={`${activeExercise} ${selectedMetric} progress chart`}
              >
                {[0, 1, 2, 3].map((index) => {
                  const y = top + (index / 3) * 170;

                  return (
                    <line
                      key={index}
                      x1={left}
                      y1={y}
                      x2={580}
                      y2={y}
                      stroke="currentColor"
                      opacity="0.12"
                      strokeDasharray="4 5"
                    />
                  );
                })}

                <polyline
                  points={points
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {points.map((point) => (
                  <circle
                    key={point.id}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="var(--primary)"
                    stroke="var(--card)"
                    strokeWidth="2"
                  >
                    <title>
                      {`${formatDate(point.date)}: ${formatNumber(
                        point.value
                      )} ${unit}`}
                    </title>
                  </circle>
                ))}

                {[0, Math.floor((points.length - 1) / 2), points.length - 1]
                  .filter(
                    (index, position, array) =>
                      array.indexOf(index) === position
                  )
                  .map((index) => (
                    <text
                      key={index}
                      x={points[index].x}
                      y="220"
                      textAnchor="middle"
                      fill="currentColor"
                      opacity="0.6"
                      fontSize="12"
                    >
                      {formatShortDate(points[index].date)}
                    </text>
                  ))}
              </svg>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Each point represents the highest recorded{" "}
            {selectedMetric} for this exercise in one completed workout.
          </p>
        </>
      )}
    </section>
  );
}

export default function ProgressContent({ data }) {
  const [selectedMetric, setSelectedMetric] = useState("WEIGHT");

  const stats = [
    {
      label: "Completed workouts",
      value: data.stats.completedWorkouts,
      icon: Dumbbell,
      description: "All-time completed sessions",
    },
    {
      label: "Active days",
      value: data.stats.activeDays,
      icon: CalendarDays,
      description: "Days you trained",
    },
    {
      label: "Completed sets",
      value: data.stats.completedSets,
      icon: Activity,
      description: "Sets marked complete",
    },
    {
      label: "Training time",
      value: formatDuration(data.stats.totalDurationSeconds),
      icon: Clock3,
      description: "Total completed workout time",
    },
  ];

  const availableMetrics = [
    ...new Set(data.measurements.map((item) => item.type)),
  ];

  const recentWorkouts = data.workouts.slice(0, 5);

  const activeMetric = availableMetrics.includes(selectedMetric)
    ? selectedMetric
    : availableMetrics[0];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page heading */}
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">
            FITNESS TRACKER
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Your Progress
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            A record of your effort, consistency, and physical progress.
          </p>
        </div>

        {/* Overview statistics */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>

                <p className="mt-4 text-2xl font-bold tabular-nums sm:text-3xl">
                  {stat.value}
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {stat.label}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* Activity calendar */}
        <WorkoutCalendar workouts={data.workouts} />

        {/* Body measurement progress */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              <h2 className="font-bold">Body progress</h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Follow changes in your recorded body measurements.
            </p>
          </div>

          {availableMetrics.length === 0 ? (
            <div className="py-10 text-center">
              <Scale
                size={28}
                className="mx-auto text-muted-foreground"
              />

              <p className="mt-3 font-semibold">
                No body measurements yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Record measurements in Settings to see your progress.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap gap-2">
                {availableMetrics.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedMetric(type)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      activeMetric === type
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {metricDetails[type]?.label || type}
                  </button>
                ))}
              </div>

              <MeasurementChart
                measurements={data.measurements}
                type={activeMetric}
              />
            </>
          )}
        </section>

        {/* Exercise performance */}
        <ExerciseProgress workouts={data.workouts} />

        {/* Recent completed workouts */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Recent workouts</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your latest completed sessions.
              </p>
            </div>

            <Trophy size={20} className="text-primary" />
          </div>

          {recentWorkouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Dumbbell
                size={28}
                className="mx-auto text-muted-foreground"
              />

              <p className="mt-3 font-semibold">
                No completed workouts yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Your completed training sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {recentWorkouts.map((workout, index) => {
                const exerciseCount = workout.exercises.length;

                const setCount = workout.exercises.reduce(
                  (total, exercise) =>
                    total + exercise.sets.length,
                  0
                );

                return (
                  <div
                    key={workout.id}
                    className={`flex items-center gap-3 p-4 ${
                      index !== recentWorkouts.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Dumbbell size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {workout.name}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(workout.completedAt)}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {exerciseCount} exercises · {setCount} sets
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">
                        {formatDuration(workout.durationSeconds)}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Duration
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
