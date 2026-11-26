import { setAdminPassword } from '../src/services/db';

const pwd = process.env.ADMIN_PASSWORD || process.argv[2];
if (!pwd) {
  console.error('Uso: ADMIN_PASSWORD="nova_senha" npm run admin:senha');
  process.exit(1);
}

setAdminPassword(pwd);
console.log('✅ Senha do administrador atualizada com sucesso (scrypt).');
