require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const store = require('./utils/store');
const complaintsRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// Segurança básica de cabeçalhos (sem depender do pacote helmet)
// ---------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------
// API
// ---------------------------------------------------------------------
app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin', adminRoutes);

// ---------------------------------------------------------------------
// Frontend estático (pasta /public)
// ---------------------------------------------------------------------
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

// rotas "bonitas" sem .html
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/acompanhar', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'acompanhar.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'login.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'dashboard.html')));

// ---------------------------------------------------------------------
// Tratamento de erros (ex: arquivo maior que o permitido pelo multer)
// ---------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message && err.message.includes('não permitido')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Arquivo muito grande. O limite é 10 MB por anexo.' });
  }
  return res.status(500).json({ error: 'Erro interno no servidor.' });
});

async function start() {
  try {
    await store.init();
  } catch (err) {
    console.error('Falha ao inicializar o armazenamento de dados:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Central de Denúncias Gatti rodando em http://localhost:${PORT}`);
  });
}

start();
