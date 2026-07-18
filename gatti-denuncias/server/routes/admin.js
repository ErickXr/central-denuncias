const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const store = require('../utils/store');
const { signAdminToken, requireAdminAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['recebida', 'em_analise', 'respondida', 'concluida'];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos.' },
});

// ---------------------------------------------------------------------
// POST /api/admin/login
// ---------------------------------------------------------------------
router.post('/login', loginLimiter, async (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) {
    return res.status(400).json({ error: 'Informe usuário e senha.' });
  }

  const admin = await store.findAdminByUsername(username.trim());
  if (!admin) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  const ok = await bcrypt.compare(senha, admin.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  const token = signAdminToken(admin.username);
  return res.json({ token, username: admin.username });
});

// A partir daqui, todas as rotas exigem autenticação de administrador
router.use(requireAdminAuth);

// ---------------------------------------------------------------------
// GET /api/admin/complaints — lista todas as denúncias
// ---------------------------------------------------------------------
router.get('/complaints', async (req, res) => {
  const complaints = await store.listComplaints();
  const result = [];
  for (const c of complaints) {
    const messages = await store.listMessages(c.id);
    const last = messages[messages.length - 1];
    result.push({
      protocol: c.id,
      type: c.type,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: messages.length,
      lastMessageFrom: last ? last.sender : null,
    });
  }
  return res.json({ complaints: result });
});

// ---------------------------------------------------------------------
// GET /api/admin/complaints/:id — detalhe de uma denúncia
// ---------------------------------------------------------------------
router.get('/complaints/:id', async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id.toUpperCase());
  if (!complaint) return res.status(404).json({ error: 'Denúncia não encontrada.' });

  const messages = await store.listMessages(complaint.id);

  return res.json({
    protocol: complaint.id,
    type: complaint.type,
    description: complaint.description,
    status: complaint.status,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    attachments: complaint.attachments.map(a => ({ name: a.originalName, storedName: a.storedName })),
    messages: messages.map(m => ({ sender: m.sender, content: m.content, createdAt: m.createdAt })),
  });
});

// ---------------------------------------------------------------------
// PATCH /api/admin/complaints/:id/status — atualizar status
// ---------------------------------------------------------------------
router.patch('/complaints/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }
  const updated = await store.updateComplaint(req.params.id.toUpperCase(), { status });
  if (!updated) return res.status(404).json({ error: 'Denúncia não encontrada.' });
  return res.json({ ok: true, status: updated.status });
});

// ---------------------------------------------------------------------
// POST /api/admin/complaints/:id/messages — psicóloga responde
// ---------------------------------------------------------------------
router.post('/complaints/:id/messages', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Escreva uma mensagem antes de enviar.' });
  }
  const complaint = await store.findComplaintById(req.params.id.toUpperCase());
  if (!complaint) return res.status(404).json({ error: 'Denúncia não encontrada.' });

  const message = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    complaintId: complaint.id,
    sender: 'psicologa',
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  await store.addMessage(message);

  if (complaint.status !== 'concluida') {
    await store.updateComplaint(complaint.id, { status: 'respondida' });
  }

  return res.status(201).json({ ok: true });
});

// ---------------------------------------------------------------------
// GET /api/admin/complaints/:id/attachments/:storedName — baixar anexo
// ---------------------------------------------------------------------
router.get('/complaints/:id/attachments/:storedName', async (req, res) => {
  const complaint = await store.findComplaintById(req.params.id.toUpperCase());
  if (!complaint) return res.status(404).json({ error: 'Denúncia não encontrada.' });

  const attachment = complaint.attachments.find(a => a.storedName === req.params.storedName);
  if (!attachment) return res.status(404).json({ error: 'Anexo não encontrado.' });

  const content = await store.getAttachmentContent(complaint.id, attachment.storedName);
  if (!content) return res.status(404).json({ error: 'Arquivo não encontrado no armazenamento.' });

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
  if (content.mimeType) res.setHeader('Content-Type', content.mimeType);
  return res.send(content.buffer);
});

module.exports = router;
