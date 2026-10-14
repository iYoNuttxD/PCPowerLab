export default function TaskTabs({ id, label, tabs, value, onChange }) {
  function navigate(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
    const current = buttons.indexOf(event.currentTarget);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    onChange(tabs[next].id);
    buttons[next].focus();
  }
  return <div className="task-tabs" role="tablist" aria-label={label}>
    {tabs.map(tab => <button key={tab.id} type="button" role="tab" id={`${id}-tab-${tab.id}`}
      aria-controls={`${id}-panel-${tab.id}`} aria-selected={value === tab.id} tabIndex={value === tab.id ? 0 : -1}
      onClick={() => onChange(tab.id)} onKeyDown={navigate}>{tab.label}</button>)}
  </div>;
}

export function TaskPanel({ id, value, active, children }) {
  return <section className="task-panel" role="tabpanel" id={`${id}-panel-${value}`}
    aria-labelledby={`${id}-tab-${value}`} hidden={!active}>{children}</section>;
}
