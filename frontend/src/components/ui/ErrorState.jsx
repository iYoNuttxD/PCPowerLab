import Alert from './Alert.jsx';
import Button from './Button.jsx';

export default function ErrorState({ message, onRetry, title }) {
  const resolvedTitle = title || resolveErrorTitle(message);

  return (
    <Alert type="error" title={resolvedTitle}>
      <p>{message || 'Não foi possível carregar os dados.'}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}
    </Alert>
  );
}

function resolveErrorTitle(message = '') {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('conectar') || normalizedMessage.includes('comunicação')) {
    return 'Falha de conexão';
  }

  return 'Não foi possível concluir';
}
