require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const store = require('./utils/store');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'public')));

const complaintsRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');

app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/acompanhar', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'acompanhar.html')));

// Rota de Admin Segura (Default: /admin, mas pode ser mudada no .env)
const adminRoute = process.env.ADMIN_ROUTE || '/admin';

// Escudo de Autenticação HTTP (Nível Servidor)
const shieldUser = process.env.SHIELD_USER || 'gatti-mestre';
const shieldPass = process.env.SHIELD_PASS || 'Gatti@2026';

const adminShield = basicAuth({
    users: { [shieldUser]: shieldPass },
    challenge: true, // Força o navegador a exibir o pop-up nativo de login
    unauthorizedResponse: 'Acesso Estritamente Proibido. Área restrita.'
});

// Aplica o escudo na rota da API do admin para proteger os dados base
app.use('/api/admin', adminShield);

const requireAdminCookie = (req, res, next) => {
    const token = req.cookies.gatti_admin_token;
    if (!token) return res.redirect(`${adminRoute}/login`);
    try {
        jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        next();
    } catch (err) {
        res.redirect(`${adminRoute}/login`);
    }
};

// Aplica o escudo invisível antes de entregar os arquivos estáticos do painel
app.get(`${adminRoute}`, adminShield, requireAdminCookie, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'dashboard.html')));
app.get(`${adminRoute}/login`, adminShield, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'login.html')));

async function startServer() {
    try {
        await store.init();
        if(!process.env.JWT_SECRET || !process.env.ADMIN_JWT_SECRET) {
            console.warn('[AVISO] JWT_SECRET e/ou ADMIN_JWT_SECRET não estão definidos no .env.');
        }
        app.listen(PORT, () => {
            console.log(`Central de Denúncias Gatti rodando em http://localhost:${PORT}`);
            if (adminRoute !== '/admin') {
                console.log(`[Segurança] Painel Admin movido para a rota oculta: http://localhost:${PORT}${adminRoute}`);
            }
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
}

startServer();
