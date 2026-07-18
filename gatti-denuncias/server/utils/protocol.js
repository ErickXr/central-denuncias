/**
 * Gera um código de protocolo único no formato GTT-XXXXXX
 * Usado pelo funcionário para acompanhar a denúncia depois (junto com a senha).
 */

const { findComplaintById } = require('./store');

async function generateProtocol() {
  let code;
  let attempts = 0;
  do {
    const rand = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
    code = `GTT-${rand}`;
    attempts++;
  } while ((await findComplaintById(code)) && attempts < 20);
  return code;
}

module.exports = { generateProtocol };
