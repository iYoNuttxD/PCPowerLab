export default function Card({ children, className = '', as: Element = 'section', ...props }) {
  return (
    <Element className={`panel-card ${className}`} {...props}>
      {children}
    </Element>
  );
}
