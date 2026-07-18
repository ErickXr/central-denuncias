const fs = require('fs');
const path = require('path');

// Se a MONGODB_URI estiver definida, usa a store do Mongo, senão cai pro File.
const useMongo = !!process.env.MONGODB_URI;

let store;

if (useMongo) {
    console.log('[store] Usando armazenamento no MongoDB Atlas.');
    store = require('./store.mongo');
} else {
    console.log('[store] Usando armazenamento em arquivo local (server/data/db.json).');
    store = require('./store.file');
}

module.exports = store;
