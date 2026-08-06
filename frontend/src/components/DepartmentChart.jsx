/**
 * Department-wise bar chart rendered with pure Tailwind (no chart library).
 * Horizontal bars scale against the largest department count.
 */
export default function DepartmentChart({ data = [] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const palette = [
    "bg-primary-600",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-lime-500",
    "bg-orange-500",
  ];

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">No data available yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.department} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-right text-xs font-medium text-slate-600">
            {item.department}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
            <div
              className={`h-full rounded-md ${palette[index % palette.length]} transition-all duration-700`}
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              title={`${item.department}: ${item.count}`}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-bold text-slate-700">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}
