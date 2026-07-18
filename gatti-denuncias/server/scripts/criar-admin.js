/**
 * Script para criar (ou redefinir a senha de) a conta de administrador —
 * a psicóloga organizacional que vai responder às denúncias.
 *
 * Modo interativo (recomendado, roda no seu terminal e pede os dados):
 *   npm run criar-admin
 *
 * Modo direto (útil em hospedagens com terminal limitado, ex: console web):
 *   npm run criar-admin -- usuario "minhaSenhaForte123"
 *
 * A senha é sempre salva já criptografada (bcrypt), nunca em texto puro.
 * Funciona tanto com o armazenamento em arquivo local quanto com MongoDB
 * (basta que o .env já esteja configurado do mesmo jeito que o servidor usa).
 */

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const store = require('../utils/store');

async function saveAdmin(username, senha) {
  if (!username) {
    console.log('Nome de usuário não pode ser vazio.');
    process.exit(1);
  }
  if (senha.length < 8) {
    console.log('A senha precisa ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const existing = await store.findAdminByUsername(username);
  const passwordHash = await bcrypt.hash(senha, 10);

  if (existing) {
    await store.updateAdminPassword(username, passwordHash);
    console.log(`\nSenha do usuário "${username}" atualizada com sucesso.`);
  } else {
    await store.createAdmin({ username, passwordHash, createdAt: new Date().toISOString() });
    console.log(`\nAdministrador "${username}" criado com sucesso.`);
  }
  console.log('Guarde essas credenciais em local seguro — elas dão acesso a todas as denúncias.');
}

(async () => {
  await store.init();

  const argUsername = process.argv[2];
  const argSenha = process.argv[3];

  if (argUsername && argSenha) {
    await saveAdmin(argUsername.trim(), argSenha);
    process.exit(0);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise(resolve => rl.question(question, resolve));

  console.log('=== Criar/redefinir acesso do administrador (psicóloga organizacional) ===\n');
  console.log('Dica: se preferir, você pode rodar direto sem perguntas interativas com:');
  console.log('  npm run criar-admin -- usuario "minhaSenhaForte123"\n');

  const username = (await ask('Nome de usuário (ex: psicologa.gatti): ')).trim();
  const senha = (await ask('Senha (mínimo 8 caracteres): ')).trim();
  rl.close();

  await saveAdmin(username, senha);
  process.exit(0);
})().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
