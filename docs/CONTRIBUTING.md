# Guia de contribuição - PCPowerLab

## Fluxo recomendado

1. Atualize sua branch local:

```bash
git checkout main
git pull origin main
```

2. Crie uma branch para sua tarefa:

```bash
git checkout -b feature/US-XX-nome-da-tarefa
```

3. Desenvolva seguindo a estrutura do projeto.
4. Rode os testes:

```bash
npm test
```

5. Faça commit com mensagem clara:

```bash
git commit -m "feat: adiciona verificação de compatibilidade de memória"
```

6. Abra Pull Request para `main`.

## Padrão de commits

- `feat:` nova funcionalidade;
- `fix:` correção de bug;
- `docs:` documentação;
- `test:` testes;
- `refactor:` melhoria interna sem alterar comportamento;
- `chore:` configuração ou manutenção.

## Regras importantes

- Não colocar regra de negócio direto nas rotas.
- Não misturar nomes em português e inglês no código.
- Preferir código simples e legível.
- Toda nova regra técnica deve ter pelo menos um teste.
