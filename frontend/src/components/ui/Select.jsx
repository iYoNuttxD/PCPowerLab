import { useEffect, useId, useRef, useState } from 'react';

export default function Select({ label, id, options = [], className = '', revealSelectedValue = false, ...props }) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const fullValueId = `${selectId}-full-value`;
  const selectRef = useRef(null);
  const [fullValue, setFullValue] = useState('');
  const selectedLabel = options.find(option => String(option.value) === String(props.value ?? ''))?.label || '';

  useEffect(() => {
    if (!revealSelectedValue || !selectRef.current) return;
    const select = selectRef.current;
    let active = true;
    function measure() {
      if (!active) return;
      const style = getComputedStyle(select);
      const context = document.createElement('canvas').getContext('2d');
      const text = select.selectedOptions[0]?.textContent || String(selectedLabel);
      if (!context) { setFullValue(text); return; }
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      // Reserve room for the native arrow as well as the declared padding.
      const available = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24;
      setFullValue(context.measureText(text).width > available ? text : '');
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(select);
    document.fonts?.ready.then(measure);
    return () => { active = false; observer.disconnect(); };
  }, [revealSelectedValue, selectedLabel]);

  const shownValue = revealSelectedValue && fullValue === selectedLabel ? fullValue : '';
  return (
    <div className={`field ${className}`}>
      <label htmlFor={selectId}>{label}</label>
      <select {...props} id={selectId} ref={selectRef}
        aria-describedby={[props['aria-describedby'], shownValue && fullValueId].filter(Boolean).join(' ') || undefined}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {shownValue && <small id={fullValueId} className="field-selected-value">{shownValue}</small>}
    </div>
  );
}
