export default function LoadingSpinner({ label = 'Carregando dados do laboratório...' }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
