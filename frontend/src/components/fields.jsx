/**
 * Small labelled form field wrapper plus styled input / select / textarea.
 * Designed to work with react-hook-form's ``register`` spread.
 */
export function Field({ label, required, error, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput({ error, className = "", ...props }) {
  return (
    <input
      {...props}
      className={`input-field ${error ? "input-error" : ""} ${className}`}
    />
  );
}

export function SelectInput({ error, children, className = "", ...props }) {
  return (
    <select
      {...props}
      className={`input-field ${error ? "input-error" : ""} ${className}`}
    >
      {children}
    </select>
  );
}

export function TextArea({ error, className = "", ...props }) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`input-field ${error ? "input-error" : ""} ${className}`}
    />
  );
}
