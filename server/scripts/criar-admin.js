require('dotenv').config();
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');
const store = require('../utils/store');

const args = process.argv.slice(2);

async function run() {
    await store.init();
    
    let username = args[0];
    let password = args[1];

    if (!username || !password) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (query) => new Promise((resolve) => rl.question(query, resolve));

        console.log('--- Criar Administrador ---');
        username = await question('Usuário: ');
        password = await question('Senha: ');
        rl.close();
    }

    if (!username || password.length < 8) {
        console.error('Erro: O usuário é obrigatório e a senha deve ter pelo menos 8 caracteres.');
        process.exit(1);
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        
        const existing = await store.getAdminByUsername(username);
        if (existing) {
            await store.updateAdminPassword(username, passwordHash);
            console.log(`Senha do administrador '${username}' atualizada com sucesso.`);
        } else {
            await store.createAdmin({
                username,
                passwordHash,
                createdAt: new Date().toISOString()
            });
            console.log(`Administrador '${username}' criado com sucesso.`);
        }
    } catch (error) {
        console.error('Erro ao processar:', error);
    } finally {
        process.exit(0);
    }
}

run();
