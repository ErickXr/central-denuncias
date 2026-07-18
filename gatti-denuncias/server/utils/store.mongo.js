/**
 * Armazenamento em MongoDB Atlas.
 * ----------------------------------------------------------------------
 * Usado automaticamente quando a variável de ambiente MONGODB_URI está
 * definida. Necessário em hospedagens gratuitas com disco efêmero
 * (ex: Render free), onde salvar em arquivo local perderia os dados
 * a cada reinício do serviço.
 *
 * O MongoDB Atlas tem um plano gratuito (M0) permanente, sem prazo de
 * validade — veja o COMO-PUBLICAR.md para o passo a passo de criação.
 *
 * Anexos são guardados como texto base64 dentro da própria coleção
 * "attachments" (cada arquivo é limitado a 10 MB pelo multer, o que
 * fica bem abaixo do limite de 16 MB por documento do MongoDB).
 */

const { MongoClient } = require('mongodb');

let client;
let db;

async function init() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI não definida, mas store.mongo.js foi carregado.');

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB_NAME || 'gatti_denuncias');

  await db.collection('complaints').createIndex({ id: 1 }, { unique: true });
  await db.collection('messages').createIndex({ complaintId: 1 });
  await db.collection('admins').createIndex({ username: 1 }, { unique: true });
  await db.collection('attachments').createIndex({ complaintId: 1, storedName: 1 });

  console.log('[store] conectado ao MongoDB Atlas com sucesso.');
}

function stripMongoId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

// ---------------------------------------------------------------------
// Denúncias
// ---------------------------------------------------------------------

async function createComplaint(complaint) {
  await db.collection('complaints').insertOne({ ...complaint });
  return complaint;
}

async function findComplaintById(id) {
  const doc = await db.collection('complaints').findOne({ id });
  return stripMongoId(doc);
}

async function listComplaints() {
  const docs = await db.collection('complaints').find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(stripMongoId);
}

async function updateComplaint(id, updates) {
  const updatedAt = new Date().toISOString();
  await db.collection('complaints').updateOne({ id }, { $set: { ...updates, updatedAt } });
  return findComplaintById(id);
}

// ---------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------

async function addMessage(message) {
  await db.collection('messages').insertOne({ ...message });
  await db.collection('complaints').updateOne(
    { id: message.complaintId },
    { $set: { updatedAt: new Date().toISOString() } }
  );
  return message;
}

async function listMessages(complaintId) {
  const docs = await db.collection('messages').find({ complaintId }).sort({ createdAt: 1 }).toArray();
  return docs.map(stripMongoId);
}

// ---------------------------------------------------------------------
// Administradores
// ---------------------------------------------------------------------

async function createAdmin(admin) {
  await db.collection('admins').insertOne({ ...admin });
  return admin;
}

async function findAdminByUsername(username) {
  const doc = await db.collection('admins').findOne({ username });
  return stripMongoId(doc);
}

async function updateAdminPassword(username, passwordHash) {
  await db.collection('admins').updateOne({ username }, { $set: { passwordHash } });
  return findAdminByUsername(username);
}

// ---------------------------------------------------------------------
// Anexos — guardados como base64 na coleção "attachments"
// ---------------------------------------------------------------------

async function saveAttachmentFiles(complaintId, files) {
  if (!files || !files.length) return [];

  const metas = [];
  for (const file of files) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
    await db.collection('attachments').insertOne({
      complaintId,
      storedName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      data: file.buffer.toString('base64'),
      createdAt: new Date().toISOString(),
    });
    metas.push({ storedName, originalName: file.originalname });
  }
  return metas;
}

async function getAttachmentContent(complaintId, storedName) {
  const doc = await db.collection('attachments').findOne({ complaintId, storedName });
  if (!doc) return null;
  return { buffer: Buffer.from(doc.data, 'base64'), mimeType: doc.mimeType };
}

module.exports = {
  backend: 'mongo',
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
