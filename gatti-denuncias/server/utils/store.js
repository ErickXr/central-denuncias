/**
 * Seletor de armazenamento — escolhe automaticamente entre:
 *
 *  - server/utils/store.mongo.js  → se a variável MONGODB_URI estiver definida
 *  - server/utils/store.file.js   → caso contrário (arquivo local)
 *
 * O resto da aplicação (rotas) sempre importa "./store" e usa as mesmas
 * funções, sem precisar saber qual dos dois está sendo usado por baixo.
 */

const impl = process.env.MONGODB_URI
  ? require('./store.mongo')
  : require('./store.file');

module.exports = impl;
