const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const store = require('../utils/store');
const { generateProtocol } = require('../utils/protocol');
const { signEmployeeToken, requireEmployeeAuth } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------
// Upload de anexos — guardados em memória (buffer) e só então repassados
// para a camada de armazenamento (arquivo local OU MongoDB, conforme
// o ambiente). Isso mantém as rotas independentes de onde os dados
// realmente ficam salvos.
// ---------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 }, // 10 MB por arquivo, até 6 arquivos
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = ('.' + file.originalname.split('.').pop()).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Tipo de arquivo não permitido. Envie apenas JPG, PNG, WEBP ou PDF.'));
    cb(null, true);
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: 'Limite de envios atingido para este período. Tente novamente mais tarde.' },
});

// ---------------------------------------------------------------------
// POST /api/complaints — registrar nova denúncia
// ---------------------------------------------------------------------
router.post('/', createLimiter, upload.array('anexos', 6), async (req, res) => {
  try {
    const { tipo, descricao, senha, anonimo } = req.body;

    if (!tipo || !descricao || !senha) {
      return res.status(400).json({ error: 'Preencha o tipo de ocorrência, a descrição e crie uma senha de acompanhamento.' });
    }
    if (descricao.trim().length < 20) {
      return res.status(400).json({ error: 'Descreva os fatos com um pouco mais de detalhe (mínimo de 20 caracteres).' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha de acompanhamento precisa ter pelo menos 6 caracteres.' });
    }

    const id = await generateProtocol();
    const passwordHash = await bcrypt.hash(senha, 10);

    const now = new Date().toISOString();
    const complaint = {
      id,
      passwordHash,
      type: tipo,
      description: descricao.trim(),
      anonymous: anonimo === 'true' || anonimo === true,
      status: 'recebida',
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    if (req.files && req.files.length) {
      complaint.attachments = await store.saveAttachmentFiles(id, req.files);
    }

    await store.createComplaint(complaint);

    return res.status(201).json({ protocol: id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Não foi possível registrar a denúncia agora. Tente novamente em instantes.' });
  }
});

// ---------------------------------------------------------------------
// POST /api/complaints/login — acessar denúncia existente (protocolo + senha)
// ---------------------------------------------------------------------
router.post('/login', loginLimiter, async (req, res) => {
  const { protocol, senha } = req.body;
  if (!protocol || !senha) {
    return res.status(400).json({ error: 'Informe o protocolo e a senha.' });
  }

  const complaint = await store.findComplaintById(protocol.trim().toUpperCase());
  if (!complaint) {
    return res.status(401).json({ error: 'Protocolo ou senha inválidos.' });
  }

  const ok = await bcrypt.compare(senha, complaint.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Protocolo ou senha inválidos.' });
  }

  const token = signEmployeeToken(complaint.id);
  return res.json({ token });
});

// ---------------------------------------------------------------------
// GET /api/complaints/me — dados da própria denúncia (autenticado)
// ---------------------------------------------------------------------
router.get('/me', requireEmployeeAuth, async (req, res) => {
  const complaint = await store.findComplaintById(req.complaintId);
  if (!complaint) return res.status(404).json({ error: 'Denúncia não encontrada.' });

  const messages = await store.listMessages(complaint.id);

  return res.json({
    protocol: complaint.id,
    type: complaint.type,
    description: complaint.description,
    status: complaint.status,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    attachments: complaint.attachments.map(a => a.originalName),
    messages: messages.map(m => ({ sender: m.sender, content: m.content, createdAt: m.createdAt })),
  });
});

// ---------------------------------------------------------------------
// POST /api/complaints/me/messages — funcionário envia nova mensagem
// ---------------------------------------------------------------------
router.post('/me/messages', requireEmployeeAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Escreva uma mensagem antes de enviar.' });
  }

  const complaint = await store.findComplaintById(req.complaintId);
  if (!complaint) return res.status(404).json({ error: 'Denúncia não encontrada.' });

  const message = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    complaintId: complaint.id,
    sender: 'funcionario',
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  await store.addMessage(message);

  return res.status(201).json({ ok: true });
});

module.exports = router;
