#!/usr/bin/env bash
# Roda a suíte de testes do openpmo-web dentro de um container node:14 com Chromium.
#
# Por que isto existe: no host (Node 25 + Chrome 152) o servidor do karma morre com
# "Cannot read properties of undefined (reading 'range')" — incompatibilidade do
# webpack-dev-middleware 3.x, que o Angular 11 usa, com Node moderno. O ponto da queda é
# aleatório e nenhum teste chega a falhar: é o servidor que cai. Dentro do container,
# a mesma suíte roda limpa.
#
# Uso:
#   ./test-docker.sh                              # suíte inteira
#   ./test-docker.sh '**/workpack-card-item*'     # só o que casar com o padrão
#
# As dependências ficam num volume nomeado (openpmo-web-testdeps), então o primeiro uso
# demora ~4 min e os seguintes começam na hora. Para recomeçar do zero:
#   docker volume rm openpmo-web-testdeps
#
# O install usa --no-save de proposito: sem isso o npm do container reescreve o
# package-lock.json do host (chegou a remover 17 mil linhas numa execucao).

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PADRAO="${1:-}"
VOLUME="openpmo-web-testdeps"
IMAGEM="node:14-bullseye"

INCLUDE=""
if [ -n "$PADRAO" ]; then
  INCLUDE="--include=\"$PADRAO\""
fi

echo ">>> Rodando os testes em $IMAGEM (host fica de fora)"
[ -n "$PADRAO" ] && echo "    filtro: $PADRAO"

docker run --rm \
  -v "$RAIZ":/app \
  -v "$VOLUME":/app/node_modules \
  -w /app \
  -e CHROME_BIN=/usr/bin/chromium \
  "$IMAGEM" bash -c "
    set -e
    if ! command -v chromium >/dev/null 2>&1; then
      echo '>>> instalando chromium...'
      apt-get update -qq >/dev/null 2>&1
      apt-get install -y -qq chromium >/dev/null 2>&1
    fi
    if [ ! -d node_modules/@angular ]; then
      echo '>>> instalando dependencias (primeira vez, ~4 min)...'
      npm install --legacy-peer-deps --no-save --no-audit --no-fund --silent
    fi
    echo '>>> ng test'
    npx ng test --watch=false --karma-config=karma.ci.js $INCLUDE
  "
