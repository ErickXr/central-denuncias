const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Assegura que os diretórios existam
function ensureDirs() {
    if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ complaints: [], messages: [], admins: [] }, null, 2));
    }
}

async function readDB() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

async function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
    async init() {
        ensureDirs();
        return true;
    },

    async createComplaint(complaint, files = []) {
        ensureDirs();
        const db = await readDB();
        
        // Criar pasta para o protocolo
        const protocolDir = path.join(UPLOADS_DIR, complaint.id);
        if (files.length > 0 && !fs.existsSync(protocolDir)) {
            fs.mkdirSync(protocolDir, { recursive: true });
        }

        const attachments = [];
        for (const file of files) {
            const ext = path.extname(file.originalname);
            const storedName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            const filePath = path.join(protocolDir, storedName);
            fs.writeFileSync(filePath, file.buffer);
            
            attachments.push({
                originalName: file.originalname,
                storedName: storedName,
                mimeType: file.mimetype
            });
        }

        complaint.attachments = attachments;
        db.complaints.push(complaint);
        await writeDB(db);
        return complaint;
    },

    async getComplaint(id) {
        const db = await readDB();
        return db.complaints.find(c => c.id === id) || null;
    },

    async getAllComplaints() {
        const db = await readDB();
        return db.complaints;
    },

    async updateComplaintStatus(id, status) {
        const db = await readDB();
        const complaint = db.complaints.find(c => c.id === id);
        if (complaint) {
            complaint.status = status;
            complaint.updatedAt = new Date().toISOString();
            await writeDB(db);
            return true;
        }
        return false;
    },

    async deleteComplaint(id) {
        const db = await readDB();
        const initialLen = db.complaints.length;
        db.complaints = db.complaints.filter(c => c.id !== id);
        db.messages = db.messages.filter(m => m.complaintId !== id);
        
        // Remove attachments directory if exists
        const protocolDir = path.join(UPLOADS_DIR, id);
        if (fs.existsSync(protocolDir)) {
            fs.rmSync(protocolDir, { recursive: true, force: true });
        }
        
        await writeDB(db);
        return db.complaints.length < initialLen;
    },

    async addMessage(message) {
        const db = await readDB();
        db.messages.push(message);
        await writeDB(db);
        return message;
    },

    async getMessages(complaintId) {
        const db = await readDB();
        return db.messages.filter(m => m.complaintId === complaintId);
    },

    async getAdminByUsername(username) {
        const db = await readDB();
        return db.admins.find(a => a.username === username) || null;
    },

    async getAllAdmins() {
        const db = await readDB();
        // Remove passwordHash para segurança no retorno
        return db.admins.map(a => ({ username: a.username, createdAt: a.createdAt }));
    },

    async createAdmin(admin) {
        const db = await readDB();
        if (db.admins.find(a => a.username === admin.username)) {
            throw new Error('Admin já existe');
        }
        db.admins.push(admin);
        await writeDB(db);
        return admin;
    },

    async updateAdminPassword(username, newHash) {
        const db = await readDB();
        const admin = db.admins.find(a => a.username === username);
        if (admin) {
            admin.passwordHash = newHash;
            await writeDB(db);
            return true;
        }
        return false;
    },

    async deleteAdmin(username) {
        const db = await readDB();
        const initialLen = db.admins.length;
        db.admins = db.admins.filter(a => a.username !== username);
        await writeDB(db);
        return db.admins.length < initialLen;
    },

    async getAttachment(complaintId, storedName) {
        const filePath = path.join(UPLOADS_DIR, complaintId, storedName);
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            const db = await readDB();
            const complaint = db.complaints.find(c => c.id === complaintId);
            const attachment = complaint?.attachments?.find(a => a.storedName === storedName);
            return {
                buffer,
                mimeType: attachment ? attachment.mimeType : 'application/octet-stream',
                originalName: attachment ? attachment.originalName : storedName
            };
        }
        return null;
    }
};
