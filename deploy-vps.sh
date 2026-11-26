#!/usr/bin/env bash
# Deploy do Controle de Projetos nas Comissões na VPS da Câmara Municipal de Itapoá.
# Uso: ADMIN_PASSWORD='senha' ./deploy-vps.sh
set -e

VPS_HOST="${VPS_HOST:-ticamitp@177.153.60.71}"
VPS_PORT="${VPS_PORT:-22}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

echo "🚀 Conectando na VPS ($VPS_HOST:$VPS_PORT) para implantar o sistema de Comissões..."

REMOTE_ENV="export ADMIN_PASSWORD=$(printf '%q' "${ADMIN_PASSWORD:-}");"

ssh -p "$VPS_PORT" -i "$SSH_KEY" "$VPS_HOST" "$REMOTE_ENV bash -s" << 'EOF'
set -e

APP_DIR=/var/www/comissoes
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone https://github.com/Surflah/Comissoes.git "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  cat > .env << ENVEOF
DATABASE_PATH="./data/comissoes.db"
SAPL_BASE_URL="https://sapl.itapoa.sc.leg.br"
CSRF_SECRET="$(openssl rand -hex 32)"
ENVEOF
  chmod 600 .env
fi

mkdir -p data

npm ci || npm install

if [ -n "$ADMIN_PASSWORD" ]; then
  npx tsx scripts/set-admin-password.ts
fi

npm run build

NPM_BIN="$(command -v npm)"
sed -e "s#^User=.*#User=$USER#" -e "s#/usr/bin/npm#$NPM_BIN#" deploy/comissoes.service | sudo tee /etc/systemd/system/comissoes.service > /dev/null
sudo systemctl daemon-reload
sudo systemctl enable comissoes.service
sudo systemctl restart comissoes.service

if [ ! -f /etc/nginx/sites-available/comissoes ] || ! grep -q "ssl_certificate" /etc/nginx/sites-available/comissoes; then
  sudo cp deploy/nginx-comissoes.conf /etc/nginx/sites-available/comissoes
  sudo ln -sf /etc/nginx/sites-available/comissoes /etc/nginx/sites-enabled/comissoes
  sudo nginx -t
  sudo systemctl reload nginx
  sudo certbot --nginx -d comissoes.camaraitapoa.sc.gov.br --non-interactive --agree-tos \
    -m tecnologia@camaraitapoa.sc.gov.br --redirect || true
fi

sleep 3
curl -sS -o /dev/null -w "HTTP local (3008): %{http_code}\n" http://127.0.0.1:3008/ || true
echo "✅ Deploy em https://comissoes.camaraitapoa.sc.gov.br concluído!"
EOF
