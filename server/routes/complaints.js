const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../utils/store');
const upload = require('../middlewares/upload');
const emailService = require('../services/email');
const { authFuncionario } = require('../middlewares/auth');

// Limite para criação de denúncias
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    message: { error: 'Muitas denúncias geradas deste IP, tente novamente mais tarde.' }
});

// Limite para envio de mensagens (30 por hora)
const messageLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 30,
    message: { error: 'Limite de mensagens atingido, aguarde antes de enviar mais.' }
});

// Rota: Criar nova denúncia (com anexos)
router.post('/', upload.array('attachments', 5), createLimiter, async (req, res) => {
    try {
        const { type, description, password, department } = req.body;

        if (!type || !description || !password || password.length < 6) {
            return res.status(400).json({ error: 'Dados inválidos. A senha deve ter no mínimo 6 caracteres.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const protocolId = generateProtocol();

        const attachments = req.files ? req.files.map(f => ({
            originalName: f.originalname,
            storedName: f.filename,
            mimeType: f.mimetype,
            size: f.size,
            buffer: f.buffer // Se for MemoryStorage (MongoDB) o buffer existe
        })) : [];

        const complaint = {
            id: protocolId,
            type,
            department: department || null,
            description,
            passwordHash,
            status: 'recebida',
            createdAt: new Date().toISOString(),
            attachments: attachments.map(a => ({
                originalName: a.originalName,
                storedName: a.storedName,
                mimeType: a.mimeType
            }))
        };// Notificação fire-and-forget
        emailService.notifyNewComplaint(protocolId);

        res.status(201).json({ protocol: saved.id, message: 'Denúncia recebida com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar denúncia.' });
    }
});

// Login do Funcionário
router.post('/login', async (req, res) => {
    try {
        const { protocol, password } = req.body;
        const complaint = await store.getComplaint(protocol);

        if (!complaint) {
            return res.status(401).json({ error: 'Protocolo ou senha incorretos.' });
        }

        const isValid = await bcrypt.compare(password, complaint.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Protocolo ou senha incorretos.' });
        }

        const token = jwt.sign({ id: complaint.id, role: 'funcionario' }, process.env.JWT_SECRET, { expiresIn: '12h' });
        
        res.json({ token, protocol: complaint.id });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar login.' });
    }
});

// Retorna dados da própria denúncia
router.get('/me', authFuncionario, async (req, res) => {
    try {
        const complaint = await store.getComplaint(req.user.id);
        if (!complaint) return res.status(404).json({ error: 'Não encontrado.' });
        
        const messages = await store.getMessages(req.user.id);

        // Remove a senha do retorno
        const { passwordHash, ...safeComplaint } = complaint;
        
        res.json({ complaint: safeComplaint, messages });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
});

// Enviar mensagem (Funcionário)
router.post('/me/messages', authFuncionario, messageLimiter, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Conteúdo vazio.' });

        const message = {
            id: `msg_${Date.now()}`,
            complaintId: req.user.id,
            sender: 'funcionario',
            content,
            createdAt: new Date().toISOString()
        };

        const saved = await store.addMessage(message);
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem.' });
    }
});

module.exports = router;
