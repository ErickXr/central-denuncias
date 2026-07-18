/**
 * Armazenamento em arquivo local (server/data/db.json + server/uploads/).
 * ----------------------------------------------------------------------
 * Usado quando a variável de ambiente MONGODB_URI NÃO está definida.
 * Bom para: rodar localmente, ou hospedar em um servidor/VPS com disco
 * de verdade (que não é apagado sozinho).
 * Ruim para: hospedagens gratuitas com disco efêmero (ex: Render free),
 * onde os dados seriam perdidos a cada reinício. Nesse caso, use o
 * MONGODB_URI para ativar o store.mongo.js automaticamente.
 */

const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

async function ensureDb() {
  if (!fssync.existsSync(DATA_DIR)) fssync.mkdirSync(DATA_DIR, { recursive: true });
  if (!fssync.existsSync(DB_PATH)) {
    await fs.writeFile(DB_PATH, JSON.stringify({ complaints: [], messages: [], admins: [] }, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error('O arquivo server/data/db.json está corrompido ou inválido.');
  }
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

async function init() {
  await ensureDb();
  if (!fssync.existsSync(UPLOAD_ROOT)) fssync.mkdirSync(UPLOAD_ROOT, { recursive: true });
  console.log('[store] usando armazenamento em arquivo local (server/data/db.json).');
}

// ---------------------------------------------------------------------
// Denúncias
// ---------------------------------------------------------------------

async function createComplaint(complaint) {
  const db = await readDb();
  db.complaints.push(complaint);
  await writeDb(db);
  return complaint;
}

async function findComplaintById(id) {
  const db = await readDb();
  return db.complaints.find(c => c.id === id) || null;
}

async function listComplaints() {
  const db = await readDb();
  return [...db.complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function updateComplaint(id, updates) {
  const db = await readDb();
  const idx = db.complaints.findIndex(c => c.id === id);
  if (idx === -1) return null;
  db.complaints[idx] = { ...db.complaints[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeDb(db);
  return db.complaints[idx];
}

// ---------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------

async function addMessage(message) {
  const db = await readDb();
  db.messages.push(message);
  const cIdx = db.complaints.findIndex(c => c.id === message.complaintId);
  if (cIdx !== -1) db.complaints[cIdx].updatedAt = new Date().toISOString();
  await writeDb(db);
  return message;
}

async function listMessages(complaintId) {
  const db = await readDb();
  return db.messages
    .filter(m => m.complaintId === complaintId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// ---------------------------------------------------------------------
// Administradores
// ---------------------------------------------------------------------

async function createAdmin(admin) {
  const db = await readDb();
  db.admins.push(admin);
  await writeDb(db);
  return admin;
}

async function findAdminByUsername(username) {
  const db = await readDb();
  return db.admins.find(a => a.username === username) || null;
}

async function updateAdminPassword(username, passwordHash) {
  const db = await readDb();
  const idx = db.admins.findIndex(a => a.username === username);
  if (idx === -1) return null;
  db.admins[idx].passwordHash = passwordHash;
  await writeDb(db);
  return db.admins[idx];
}

// ---------------------------------------------------------------------
// Anexos — salvos como arquivos de verdade em server/uploads/<protocolo>/
// ---------------------------------------------------------------------

async function saveAttachmentFiles(complaintId, files) {
  if (!files || !files.length) return [];
  const dir = path.join(UPLOAD_ROOT, complaintId);
  await fs.mkdir(dir, { recursive: true });

  const metas = [];
  for (const file of files) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
    await fs.writeFile(path.join(dir, storedName), file.buffer);
    metas.push({ storedName, originalName: file.originalname });
  }
  return metas;
}

async function getAttachmentContent(complaintId, storedName) {
  const filePath = path.join(UPLOAD_ROOT, complaintId, storedName);
  try {
    const buffer = await fs.readFile(filePath);
    return { buffer };
  } catch (e) {
    return null;
  }
}

module.exports = {
  backend: 'file',
  init,
  createComplaint,
  findComplaintById,
  listComplaints,
  updateComplaint,
  addMessage,
  listMessages,
  createAdmin,
  findAdminByUsername,
  updateAdminPassword,
  saveAttachmentFiles,
  getAttachmentContent,
};
