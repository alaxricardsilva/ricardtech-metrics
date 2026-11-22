# Registro de Alterações (Changelog)

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-11-21

### Adicionado
- Coletor unificado de métricas em Node.js puro sem dependências externas para GitHub, GitLab e Forgejo.
- Suporte a descoberta automática dos 68 repositórios de todo o ecossistema Ricard Tech.
- Normalização de nomes e aliases de identificadores (suporte completo a hífen e sublinhado).
- Gerador de SVGs modernos e responsivos com suporte nativo a Tema Escuro e Tema Claro.
- Painel geral consolidado do ecossistema em `charts/overview.svg`.
- Armazenamento de histórico temporal com granularidade diária em `data/*.json`.
- Automação via GitHub Actions agendada 2x ao dia (00:00 e 12:00 no horário de Brasília / America/Sao_Paulo).
- Sincronização automatizada com Triplo-Push nos 3 remotes simultaneamente (GitHub, GitLab e Forgejo).
- Script de injeção automática de badges nos repositórios locais em `scripts/inject-badges.py`.
- Suíte de testes unitários com o executor nativo do Node.js (`node --test`).
