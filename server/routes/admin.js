const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../utils/store');
const { authAdmin } = require('../middlewares/auth');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await store.getAdminByUsername(username);

        if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
            return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
        }

        const token = jwt.sign({ username: admin.username, role: 'admin' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '8h' });
        
        // Define Cookie Seguro (HttpOnly)
        res.cookie('gatti_admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });

        res.json({ success: true, username: admin.username });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar login.' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('gatti_admin_token');
    res.json({ success: true });
});

// Todas as rotas abaixo requerem autenticação
router.use(authAdmin);

router.get('/complaints', async (req, res) => {
    try {
        const complaints = await store.getAllComplaints();
        const safe = complaints.map(c => {
            const { passwordHash, ...rest } = c;
            return rest;
        });
        res.json(safe);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar denúncias.' });
    }
});

router.get('/complaints/:id', async (req, res) => {
    try {
        const complaint = await store.getComplaint(req.params.id);
        if (!complaint) return res.status(404).json({ error: 'Denúncia não encontrada.' });
        
        const messages = await store.getMessages(req.params.id);
        const { passwordHash, ...safe } = complaint;
        
        res.json({ complaint: safe, messages });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar denúncia.' });
    }
});

router.patch('/complaints/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['recebida', 'em_analise', 'respondida', 'concluida'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido.' });

        const updated = await store.updateComplaintStatus(req.params.id, status);
        if (updated) res.json({ success: true });
        else res.status(404).json({ error: 'Denúncia não encontrada.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
});

router.post('/complaints/:id/messages', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Conteúdo vazio.' });

        const message = {
            id: `msg_${Date.now()}`,
            complaintId: req.params.id,
            sender: 'psicologa',
            content,
            createdAt: new Date().toISOString()
        };

        const saved = await store.addMessage(message);
        await store.updateComplaintStatus(req.params.id, 'respondida');
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem.' });
    }
});

router.delete('/complaints/:id', async (req, res) => {
    try {
        const deleted = await store.deleteComplaint(req.params.id);
        if (deleted) res.json({ success: true });
        else res.status(404).json({ error: 'Denúncia não encontrada.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar denúncia.' });
    }
});

router.get('/complaints/:id/attachments/:storedName', async (req, res) => {
    try {
        const { id, storedName } = req.params;
        const attachment = await store.getAttachment(id, storedName);
        if (!attachment) return res.status(404).send('Arquivo não encontrado.');
        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
        res.send(attachment.buffer);
    } catch (error) {
        res.status(500).send('Erro ao baixar arquivo.');
    }
});

// Equipe
router.get('/team', async (req, res) => {
    try {
        const admins = await store.getAllAdmins();
        res.json(admins);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar administradores.' });
    }
});

router.post('/team', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password || password.length < 8) {
            return res.status(400).json({ error: 'Usuário e senha (mínimo 8 caracteres) são obrigatórios.' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        await store.createAdmin({ username, passwordHash, createdAt: new Date().toISOString() });
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Erro ao criar administrador.' });
    }
});

router.delete('/team/:username', async (req, res) => {
    try {
        const target = req.params.username;
        if (target === req.user.username) return res.status(400).json({ error: 'Você não pode se deletar.' });
        const admins = await store.getAllAdmins();
        if (admins.length <= 1) return res.status(400).json({ error: 'Não é possível remover o último administrador.' });

        const deleted = await store.deleteAdmin(target);
        if (deleted) res.json({ success: true });
        else res.status(404).json({ error: 'Admin não encontrado.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover administrador.' });
    }
});

module.exports = router;
