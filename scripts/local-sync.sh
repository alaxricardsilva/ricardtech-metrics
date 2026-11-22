#!/usr/bin/env bash
set -eo pipefail

# Diretório base do ricardtech-metrics
PROJECT_DIR="/home/alaxricard/Documentos/ricardtech-metrics"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/local-sync.log"

mkdir -p "$LOG_DIR"

echo "==================================================" >> "$LOG_FILE"
echo "🕒 [$(date '+%Y-%m-%d %H:%M:%S %Z')] Iniciando sincronização local de métricas..." >> "$LOG_FILE"

cd "$PROJECT_DIR"

# 1. Puxa eventuais atualizações remotas primeiro
git pull --rebase origin main >> "$LOG_FILE" 2>&1 || true

# 2. Executa o coletor local de métricas e gerador de SVG
/usr/sbin/node src/local-collector.js >> "$LOG_FILE" 2>&1

# 3. Verifica se houve alteração em charts/ ou data/
git add charts/ data/
if git diff --cached --quiet; then
    echo "ℹ️  Nenhuma alteração nos dados ou gráficos neste ciclo." >> "$LOG_FILE"
else
    echo "📦 Alterações detectadas. Criando commit e executando Triplo-Push..." >> "$LOG_FILE"
    git commit -m "chore(metrics): auto-update local repository growth metrics [a cada 3h]" >> "$LOG_FILE" 2>&1
    git push origin main >> "$LOG_FILE" 2>&1
    echo "✅ Sincronização e Triplo-Push concluídos com sucesso!" >> "$LOG_FILE"
fi

echo "🏁 [$(date '+%Y-%m-%d %H:%M:%S %Z')] Ciclo finalizado." >> "$LOG_FILE"
