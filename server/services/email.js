const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    console.log('[email] Configurações de e-mail carregadas.');
} else {
    console.log('[email] Variáveis SMTP não configuradas. Notificações por e-mail desativadas.');
}

async function notifyNewComplaint(complaintId) {
    if (!transporter || !process.env.NOTIFY_EMAIL) return;

    try {
        const mailOptions = {
            from: `"Central Gatti" <${process.env.SMTP_USER}>`,
            to: process.env.NOTIFY_EMAIL,
            subject: `Nova Denúncia Recebida - Protocolo ${complaintId}`,
            text: `Aviso automático: Uma nova denúncia anônima foi registrada na Central.\n\nProtocolo: ${complaintId}\n\nAcesse o painel administrativo para visualizar os detalhes.\n\nEste é um e-mail automático, não responda.`,
            html: `<p>Aviso automático: Uma nova denúncia anônima foi registrada na Central.</p>
                   <p><strong>Protocolo:</strong> ${complaintId}</p>
                   <p>Acesse o <a href="http://localhost:${process.env.PORT || 3000}/admin">painel administrativo</a> para visualizar os detalhes.</p>
                   <hr><p><small>Este é um e-mail automático, não responda.</small></p>`
        };

        transporter.sendMail(mailOptions).catch(err => {
            console.error('[email] Erro ao enviar notificação:', err);
        });
    } catch (error) {
        console.error('[email] Erro inesperado ao tentar notificar:', error);
    }
}

module.exports = {
    notifyNewComplaint
};
