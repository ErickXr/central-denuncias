document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const protocolSection = document.getElementById('protocol-section');
    const loginForm = document.getElementById('login-form');
    const messageForm = document.getElementById('message-form');
    const logoutBtn = document.getElementById('logout-btn');

    // Tentar autologin se houver token
    const token = localStorage.getItem('gatti_token');
    if (token) {
        loadProtocolData(token);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const protocol = document.getElementById('protocol').value.trim().toUpperCase();
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/complaints/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ protocol, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            localStorage.setItem('gatti_token', data.token);
            loginForm.reset();
            loadProtocolData(data.token);
        } catch (error) {
            alert(error.message);
        }
    });

    async function loadProtocolData(token) {
        try {
            const res = await fetch('/api/complaints/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) logout();
                throw new Error('Erro ao carregar dados.');
            }

            const data = await res.json();
            renderProtocol(data.complaint, data.messages);
            
            loginSection.classList.add('hidden');
            protocolSection.classList.remove('hidden');
        } catch (error) {
            console.error(error);
        }
    }

    function renderProtocol(complaint, messages) {
        document.getElementById('r-status').className = `badge badge-${complaint.status}`;
        document.getElementById('r-type').textContent = complaint.type.toUpperCase();
        document.getElementById('r-department').textContent = complaint.department || 'Não especificado';
        document.getElementById('r-date').textContent = new Date(complaint.createdAt).toLocaleString('pt-BR');
        document.getElementById('r-description').textContent = complaint.description;

        document.getElementById('display-protocol').textContent = complaint.id;

        const statusBadge = document.getElementById('display-status');
        statusBadge.textContent = complaint.status.replace('_', ' ');
        statusBadge.className = `badge badge-${complaint.status}`;

        renderMessages(messages);
    }

    function renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (messages.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Nenhuma mensagem trocada ainda.</p>';
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isFunc = msg.sender === 'funcionario';
            const cls = isFunc ? 'message-funcionario' : 'message-psicologa';
            const name = isFunc ? 'Você' : 'Equipe Gatti';
            return `
                <div class="message ${cls}">
                    <div class="msg-header">
                        <strong>${name}</strong>
                        <span>${new Date(msg.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <div style="white-space: pre-wrap; color: var(--white);">${msg.content}</div>
                </div>
            `;
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('message-content').value;
        const token = localStorage.getItem('gatti_token');

        try {
            const res = await fetch('/api/complaints/me/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao enviar.');
            }

            document.getElementById('message-content').value = '';
            loadProtocolData(token);
        } catch (error) {
            alert(error.message);
        }
    });

    logoutBtn.addEventListener('click', logout);

    function logout() {
        localStorage.removeItem('gatti_token');
        protocolSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    }
});
