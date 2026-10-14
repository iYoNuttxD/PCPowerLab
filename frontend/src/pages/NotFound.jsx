import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';

export default function NotFound() {
  return (
    <div className="not-found">
      <Card>
        <span className="eyebrow">404</span>
        <h1>Página não encontrada</h1>
        <p>Confira o endereço ou volte ao início para continuar.</p>
        <Link className="btn btn-primary btn-md" to="/">Voltar ao início</Link>
      </Card>
    </div>
  );
}
