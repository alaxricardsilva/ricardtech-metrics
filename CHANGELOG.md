# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-11-21

### Adicionado
- Coletor unificado de métricas em Node.js puro (sem dependências externas) para GitHub, GitLab e Forgejo.
- Suporte a descoberta automática dos mais de 60 repositórios do ecossistema Ricard Tech.
- Consolidação de estrelas, forks e downloads de releases por repositório.
- Gerador de SVGs modernos e responsivos com suporte nativo a Dark Mode e Light Mode.
- Geração de painel consolidado global `charts/overview.svg`.
- Armazenamento de histórico temporal dia a dia em `data/*.json`.
- Automação via GitHub Actions agendada para executar 2x ao dia (`00:00` e `12:00` UTC).
- Suporte a commit e sincronização com Triplo-Push nos 3 remotes simultaneamente.
- Suíte completa de testes unitários com o test runner nativo do Node.js.
