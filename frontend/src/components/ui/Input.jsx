import { useId } from 'react';

export default function Input({ label, id, hint, error, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={`field ${className}`}>
      <label htmlFor={inputId}>{label}</label>
      <input {...props} id={inputId} aria-invalid={Boolean(error) || props['aria-invalid'] || false}
        aria-describedby={[props['aria-describedby'], (hint || error) && descriptionId].filter(Boolean).join(' ') || undefined} />
      {(hint || error) && <div id={descriptionId} className="field-messages">
        {hint && <small>{hint}</small>}
        {error && <small className="field-error" aria-live="polite">{error}</small>}
      </div>}
    </div>
  );
}
