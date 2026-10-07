import { Radar } from 'lucide-react';
import Card from './Card.jsx';

export default function EmptyState({ title = 'Nada encontrado', message = 'Tente ajustar os filtros ou atualizar a página.', children }) {
  return (
    <Card className="empty-state" role="status">
      <Radar size={34} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{message}</p>
      {children}
    </Card>
  );
}
