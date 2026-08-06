/**
 * Dashboard statistic card.
 */
export default function StatCard({ icon: Icon, label, value, accent = "primary", sub }) {
  const accents = {
    primary: "bg-primary-50 text-primary-700",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${accents[accent]}`}>
        <Icon />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-tight text-slate-900">{value}</p>
        <p className="truncate text-sm font-medium text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
