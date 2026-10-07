import { useId } from 'react';

export default function Input({ label, id, hint, error, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span>{label}</span>
      <input {...props} id={inputId} aria-invalid={Boolean(error)}
        aria-describedby={[props['aria-describedby'], (hint || error) && descriptionId].filter(Boolean).join(' ') || undefined} />
      {hint && !error && <small id={descriptionId}>{hint}</small>}
      {error && <small id={descriptionId} className="field-error">{error}</small>}
    </label>
  );
}
