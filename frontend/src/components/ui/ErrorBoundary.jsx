import { Component } from 'react';
import Alert from './Alert.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <Alert type="error" title="O painel encontrou um erro">
            Recarregue a página. Se o problema continuar, verifique se a API do PCPowerLab está online.
          </Alert>
        </main>
      );
    }

    return this.props.children;
  }
}
