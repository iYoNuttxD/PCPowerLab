export default function Badge({ children, tone = 'cyan' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
