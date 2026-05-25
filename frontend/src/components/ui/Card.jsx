export default function Card({ children, className = '', as: Element = 'section' }) {
  return (
    <Element className={`panel-card ${className}`}>
      {children}
    </Element>
  );
}
