export default function Input({ label, id, hint, error, className = '', ...props }) {
  const inputId = id || props.name;

  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} aria-invalid={Boolean(error)} {...props} />
      {hint && !error && <small>{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
