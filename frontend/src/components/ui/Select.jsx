export default function Select({ label, id, options = [], className = '', ...props }) {
  const selectId = id || props.name;

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
