
import MeasurementHistory from "../../../components/settings/measurement-history";

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">
            FITNESS TRACKER
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Body measurements
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Record your measurements and follow your physical progress over time.
          </p>
        </div>

        {/* Measurement history and recording */}
        <MeasurementHistory />
      </div>
    </div>
  );
}
