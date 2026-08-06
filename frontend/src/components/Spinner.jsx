/**
 * Reusable loading spinner.
 */
export default function Spinner({ label = "Loading...", className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-slate-500 ${className}`}>
      <span className="h-6 w-6 animate-spin-slow rounded-full border-[3px] border-primary-200 border-t-primary-700" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

/**
 * Full-screen overlay spinner (used during route-level loading).
 */
export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Spinner label="Please wait..." />
    </div>
  );
}
