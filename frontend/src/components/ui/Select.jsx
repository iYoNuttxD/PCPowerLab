import { useId } from 'react';

export default function Select({ label, id, options = [], className = '', ...props }) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <label className={`field ${className}`} htmlFor={selectId}>
      <span>{label}</span>
      <select id={selectId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
