const { MongoClient } = require('mongodb');

let client;
let db;

async function getDB() {
    if (!db) {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        db = client.db();
    }
    return db;
}

module.exports = {
    async init() {
        try {
            await getDB();
            return true;
        } catch (error) {
            console.error('[store] Erro ao conectar no MongoDB:', error);
            throw error;
        }
    },

    async createComplaint(complaint, files = []) {
        const database = await getDB();
        
        const attachments = [];
        for (const file of files) {
            const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
            const storedName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            
            // Salvar no gridfs ou coleção própria. A instrução pediu base64 na coleção attachments
            await database.collection('attachments').insertOne({
                complaintId: complaint.id,
                storedName: storedName,
                originalName: file.originalname,
                mimeType: file.mimetype,
                data: file.buffer.toString('base64'),
                createdAt: new Date().toISOString()
            });

            attachments.push({
                originalName: file.originalname,
                storedName: storedName,
                mimeType: file.mimetype
            });
        }

        complaint.attachments = attachments;
        await database.collection('complaints').insertOne(complaint);
        return complaint;
    },

    async getComplaint(id) {
        const database = await getDB();
        return await database.collection('complaints').findOne({ id: id });
    },

    async getAllComplaints() {
        const database = await getDB();
        return await database.collection('complaints').find({}).sort({ createdAt: -1 }).toArray();
    },

    async updateComplaintStatus(id, status) {
        const database = await getDB();
        const result = await database.collection('complaints').updateOne(
            { id: id },
            { $set: { status: status, updatedAt: new Date().toISOString() } }
        );
        return result.modifiedCount > 0;
    },

    async deleteComplaint(id) {
        const database = await getDB();
        await database.collection('attachments').deleteMany({ complaintId: id });
        await database.collection('messages').deleteMany({ complaintId: id });
        const result = await database.collection('complaints').deleteOne({ id: id });
        return result.deletedCount > 0;
    },

    async addMessage(message) {
        const database = await getDB();
        await database.collection('messages').insertOne(message);
        return message;
    },

    async getMessages(complaintId) {
        const database = await getDB();
        return await database.collection('messages').find({ complaintId: complaintId }).sort({ createdAt: 1 }).toArray();
    },

    async getAdminByUsername(username) {
        const database = await getDB();
        return await database.collection('admins').findOne({ username: username });
    },

    async getAllAdmins() {
        const database = await getDB();
        return await database.collection('admins').find({}, { projection: { passwordHash: 0, _id: 0 } }).toArray();
    },

    async createAdmin(admin) {
        const database = await getDB();
        const existing = await database.collection('admins').findOne({ username: admin.username });
        if (existing) throw new Error('Admin já existe');
        await database.collection('admins').insertOne(admin);
        return admin;
    },

    async updateAdminPassword(username, newHash) {
        const database = await getDB();
        const result = await database.collection('admins').updateOne(
            { username: username },
            { $set: { passwordHash: newHash } }
        );
        return result.modifiedCount > 0;
    },

    async deleteAdmin(username) {
        const database = await getDB();
        const result = await database.collection('admins').deleteOne({ username: username });
        return result.deletedCount > 0;
    },

    async getAttachment(complaintId, storedName) {
        const database = await getDB();
        const attachment = await database.collection('attachments').findOne({ 
            complaintId: complaintId, 
            storedName: storedName 
        });

        if (attachment) {
            return {
                buffer: Buffer.from(attachment.data, 'base64'),
                mimeType: attachment.mimeType,
                originalName: attachment.originalName
            };
        }
        return null;
    }
};
