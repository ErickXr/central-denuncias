document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('gatti_admin_user') || 'Admin';
    document.getElementById('user-display').textContent = `Olá, ${username}`;

    // Wrapper para fetch enviando cookies automaticamente (same-origin)
    const fetchAuth = (url, options = {}) => {
        options.credentials = 'same-origin';
        return fetch(url, options);
    };

    let myChart = null;

    // Navegação de abas
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            document.getElementById('view-complaints').classList.add('hidden');
            document.getElementById('view-stats').classList.add('hidden');
            document.getElementById('view-team').classList.add('hidden');
            
            const target = e.target.getAttribute('data-target');
            document.getElementById(target).classList.remove('hidden');

            if (target === 'view-complaints') loadComplaints();
            if (target === 'view-stats') loadComplaints(); // carrega os dados atualizados para o gráfico
            if (target === 'view-team') loadTeam();
        });
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await fetchAuth('/api/admin/logout', { method: 'POST' });
        } catch(e) {}
        localStorage.removeItem('gatti_admin_user');
        window.location.href = window.location.pathname + '/login';
    });

    // --- Denúncias ---
    const complaintsTable = document.getElementById('complaints-table').querySelector('tbody');
    document.getElementById('refresh-complaints').addEventListener('click', loadComplaints);

    async function loadComplaints() {
        try {
            const res = await fetchAuth('/api/admin/complaints');
            if (!res.ok) {
                if (res.status === 401) window.location.href = window.location.pathname + '/login';
                throw new Error('Falha ao carregar');
            }
            const data = await res.json();
            renderComplaints(data);
            renderStats(data);
        } catch (error) {
            console.error(error);
        }
    }

    function renderComplaints(data) {
        complaintsTable.innerHTML = data.map(c => `
            <tr class="clickable-row" onclick="openComplaint('${c.id}')">
                <td class="mono">${c.id}</td>
                <td>${c.type.toUpperCase()}</td>
                <td><span class="badge badge-${c.status}">${c.status.replace('_', ' ')}</span></td>
                <td>${new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
            </tr>
        `).join('');
    }

    function renderStats(complaints) {
        // Filtra denúncias que possuem um departamento atribuído
        const withDept = complaints.filter(c => c.department && c.department.trim() !== '');
        
        // Conta as ocorrências por departamento
        const counts = {};
        withDept.forEach(c => {
            counts[c.department] = (counts[c.department] || 0) + 1;
        });

        const labels = Object.keys(counts);
        const dataValues = Object.values(counts);

        const ctx = document.getElementById('deptChart').getContext('2d');

        if (myChart) {
            myChart.destroy();
        }

        if (labels.length === 0) {
            // Se não houver dados, destrói e retorna
            return;
        }

        Chart.defaults.color = '#888';
        Chart.defaults.font.family = 'Inter, sans-serif';

        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Denúncias',
                    data: dataValues,
                    backgroundColor: [
                        '#b8924f', // Dourado Gatti
                        '#444444', // Grafite
                        '#ffffff', // Branco
                        '#ff6b6b', // Vermelho suave
                        '#4ecdc4', // Turquesa
                        '#45b7d1', // Azul claro
                        '#96ceb4', // Verde pastel
                        '#ffeead'  // Amarelo pastel
                    ],
                    borderWidth: 2,
                    borderColor: '#1e1e1e' // Cor de fundo do painel
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });
    }

    // Modal Denúncia
    const modal = document.getElementById('modal-complaint');
    let currentProtocol = null;

    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.add('hidden');
        currentProtocol = null;
    });

    window.openComplaint = async (id) => {
        try {
            const res = await fetchAuth(`/api/admin/complaints/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error();

            currentProtocol = data.complaint.id;
            
            document.getElementById('m-protocol').textContent = data.complaint.id;
            document.getElementById('m-type').textContent = data.complaint.type.toUpperCase();
            document.getElementById('m-department').textContent = data.complaint.department || 'Não especificado';
            document.getElementById('m-date').textContent = new Date(data.complaint.createdAt).toLocaleString('pt-BR');
            document.getElementById('m-description').textContent = data.complaint.description;
            document.getElementById('m-status-select').value = data.complaint.status;

            const attContainer = document.getElementById('m-attachments');
            if (data.complaint.attachments && data.complaint.attachments.length > 0) {
                attContainer.innerHTML = data.complaint.attachments.map(a => `
                    <li><a href="/api/admin/complaints/${data.complaint.id}/attachments/${a.storedName}" target="_blank" style="color: var(--gold); text-decoration: none;">📎 ${a.originalName}</a></li>
                `).join('');
            } else {
                attContainer.innerHTML = '<li style="color: var(--gray);">Nenhum anexo</li>';
            }

            renderMessages(data.messages);
            modal.classList.remove('hidden');
        } catch (err) {
            alert('Erro ao abrir denúncia.');
        }
    };

    function renderMessages(messages) {
        const container = document.getElementById('m-messages');
        if (messages.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray);">Nenhuma mensagem.</p>';
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isFunc = msg.sender === 'funcionario';
            const cls = isFunc ? 'message-funcionario' : 'message-psicologa';
            const name = isFunc ? 'Funcionário' : 'Equipe (Você)';
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

    document.getElementById('m-status-select').addEventListener('change', async (e) => {
        if (!currentProtocol) return;
        try {
            const res = await fetchAuth(`/api/admin/complaints/${currentProtocol}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: e.target.value })
            });
            if (res.ok) loadComplaints();
        } catch (err) {
            alert('Erro ao mudar status.');
        }
    });

    document.getElementById('btn-delete-complaint').addEventListener('click', async () => {
        if (!currentProtocol) return;
        if (!confirm('ATENÇÃO: Deseja apagar definitivamente esta denúncia e todos os anexos? Esta ação não pode ser desfeita.')) return;
        
        try {
            const res = await fetchAuth(`/api/admin/complaints/${currentProtocol}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                modal.classList.add('hidden');
                loadComplaints();
            } else {
                alert('Erro ao apagar.');
            }
        } catch (err) {
            alert('Erro de conexão.');
        }
    });

    document.getElementById('m-reply-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('m-reply-content').value;
        if (!currentProtocol || !content.trim()) return;

        try {
            const res = await fetchAuth(`/api/admin/complaints/${currentProtocol}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                document.getElementById('m-reply-content').value = '';
                openComplaint(currentProtocol);
                loadComplaints();
            }
        } catch (error) {
            alert('Erro ao responder.');
        }
    });

    // --- Equipe ---
    const teamTable = document.getElementById('team-table').querySelector('tbody');
    document.getElementById('btn-new-admin').addEventListener('click', () => {
        document.getElementById('form-new-admin').classList.remove('hidden');
    });

    async function loadTeam() {
        try {
            const res = await fetchAuth('/api/admin/team');
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            teamTable.innerHTML = data.map(a => `
                <tr>
                    <td>${a.username}</td>
                    <td>${new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; color: #dc3545; border-color: #dc3545;" onclick="deleteAdmin('${a.username}')">Remover</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Erro ao carregar equipe');
        }
    }

    document.getElementById('add-admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('new-admin-user').value;
        const pass = document.getElementById('new-admin-pass').value;

        try {
            const res = await fetchAuth('/api/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });

            if (res.ok) {
                document.getElementById('new-admin-user').value = '';
                document.getElementById('new-admin-pass').value = '';
                document.getElementById('form-new-admin').classList.add('hidden');
                loadTeam();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            alert('Erro de conexão.');
        }
    });

    window.deleteAdmin = async (targetUsername) => {
        if (targetUsername === username) {
            alert('Você não pode remover a si mesmo.');
            return;
        }
        if (!confirm(`Remover o administrador ${targetUsername}?`)) return;

        try {
            const res = await fetchAuth(`/api/admin/team/${targetUsername}`, { method: 'DELETE' });
            if (res.ok) {
                loadTeam();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            alert('Erro de conexão.');
        }
    };

    loadComplaints();
});
