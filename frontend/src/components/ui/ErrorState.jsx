import Alert from './Alert.jsx';
import Button from './Button.jsx';

export default function ErrorState({ message, onRetry }) {
  return (
    <Alert type="error" title="Falha de comunicação">
      <p>{message || 'Não foi possível carregar os dados.'}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}
    </Alert>
  );
}
