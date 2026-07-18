/**
 * Middlewares de autenticação.
 * Dois tipos de sessão, com segredos e escopos diferentes:
 *  - "employee": token que só dá acesso à PRÓPRIA denúncia (protocolo + senha)
 *  - "admin":    token da psicóloga / equipe responsável, com acesso a tudo
 */

const jwt = require('jsonwebtoken');

const EMPLOYEE_SECRET = process.env.JWT_SECRET;
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET;

if (!EMPLOYEE_SECRET || !ADMIN_SECRET) {
  console.warn(
    '[AVISO] JWT_SECRET e/ou ADMIN_JWT_SECRET não estão definidos no .env. ' +
    'Defina segredos fortes antes de publicar em produção.'
  );
}

function signEmployeeToken(complaintId) {
  return jwt.sign({ complaintId, role: 'employee' }, EMPLOYEE_SECRET, { expiresIn: '4h' });
}

function signAdminToken(username) {
  return jwt.sign({ username, role: 'admin' }, ADMIN_SECRET, { expiresIn: '8h' });
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (token) return token;
  // fallback: permite token via ?token=... — necessário para links de download
  // de anexos abertos diretamente pelo navegador (que não enviam cabeçalhos customizados)
  if (req.query && req.query.token) return req.query.token;
  return null;
}

function requireEmployeeAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Sessão não encontrada. Faça login novamente.' });
  try {
    const payload = jwt.verify(token, EMPLOYEE_SECRET);
    if (payload.role !== 'employee') throw new Error('role inválida');
    req.complaintId = payload.complaintId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
}

function requireAdminAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Sessão não encontrada. Faça login novamente.' });
  try {
    const payload = jwt.verify(token, ADMIN_SECRET);
    if (payload.role !== 'admin') throw new Error('role inválida');
    req.adminUsername = payload.username;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
}

module.exports = {
  signEmployeeToken,
  signAdminToken,
  requireEmployeeAuth,
  requireAdminAuth,
};
