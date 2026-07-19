const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function notifyNewComplaint(complaintId) {
    if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_EMAIL) {
        console.log('[email] Variáveis do Resend não configuradas. Notificação ignorada.');
        return;
    }

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        const response = await resend.emails.send({
            from: `Central Gatti <${fromEmail}>`,
            to: process.env.NOTIFY_EMAIL,
            subject: `Nova Denúncia Recebida - Protocolo ${complaintId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #b8924f;">Aviso Automático da Central</h2>
                    <p>Uma nova denúncia anônima acaba de ser registrada na sua plataforma.</p>
                    <p><strong>Protocolo:</strong> ${complaintId}</p>
                    <p>Por favor, acesse o painel administrativo (na rota <strong>/gestao-interna</strong>) para visualizar os detalhes, o departamento envolvido e os possíveis anexos.</p>
                    <hr style="border: 1px solid #eee; margin-top: 30px;">
                    <p><small style="color: #999;">Este é um e-mail gerado automaticamente. Por favor, não responda.</small></p>
                </div>
            `
        });

        if (response.error) {
            console.error('[email] Erro retornado pela API do Resend:', response.error);
        } else {
            console.log('[email] E-mail de notificação enviado via Resend! ID:', response.data.id);
        }
    } catch (error) {
        console.error('[email] Erro inesperado ao tentar notificar pelo Resend:', error);
    }
}

module.exports = {
    notifyNewComplaint
};
