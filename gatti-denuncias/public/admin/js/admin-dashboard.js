/* ============================================================================
   CENTRAL DE DENÚNCIAS — GATTI — PAINEL ADMIN
   Lógica do dashboard: listar, filtrar, ver detalhe, responder, mudar status
   ============================================================================ */

(function () {
  const TOKEN_KEY = 'gatti_admin_token';
  const USER_KEY = 'gatti_admin_username';

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  document.getElementById('who-label').textContent = localStorage.getItem(USER_KEY) || 'Administrador';

  const listEl = document.getElementById('complaint-list');
  const countLabel = document.getElementById('count-label');
  const detailPanel = document.getElementById('detail-panel');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const logoutBtn = document.getElementById('logout-btn');

  const STATUS_LABELS = {
    recebida: 'Recebida',
    em_analise: 'Em análise',
    respondida: 'Respondida',
    concluida: 'Concluída',
  };

  let allComplaints = [];
  let currentFilter = 'todas';
  let activeProtocol = null;

  function authHeaders(extra) {
    return Object.assign({ Authorization: `Bearer ${token}` }, extra || {});
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function handleAuthError(res) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/admin';
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // Lista
  // ---------------------------------------------------------------------
  async function loadList() {
    try {
      const res = await fetch('/api/admin/complaints', { headers: authHeaders() });
      if (await handleAuthError(res)) return;
      const data = await res.json();
      allComplaints = data.complaints;
      renderList();
    } catch (e) {
      countLabel.textContent = 'Erro ao carregar.';
    }
  }

  function renderList() {
    const filtered = currentFilter === 'todas'
      ? allComplaints
      : allComplaints.filter(c => c.status === currentFilter);

    countLabel.textContent = `${filtered.length} denúncia${filtered.length === 1 ? '' : 's'}`;
    listEl.innerHTML = '';

    if (!filtered.length) {
      listEl.innerHTML = '<div class="thread-empty" style="padding:24px;">Nenhuma denúncia nesta categoria.</div>';
      return;
    }

    filtered.forEach(c => {
      const item = document.createElement('div');
      item.className = 'complaint-item' + (c.protocol === activeProtocol ? ' active' : '');
      item.innerHTML = `
        <div class="row1">
          <span class="code">${c.protocol}</span>
          <span class="status-pill status-${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
        </div>
        <span class="type">${escapeHtml(c.type)}</span>
        <span class="date">${formatDate(c.createdAt)}</span>
      `;
      item.addEventListener('click', () => loadDetail(c.protocol));
      listEl.appendChild(item);
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderList();
    });
  });

  // ---------------------------------------------------------------------
  // Detalhe
  // ---------------------------------------------------------------------
  async function loadDetail(protocol) {
    activeProtocol = protocol;
    renderList();
    detailPanel.innerHTML = '<div class="admin-detail-empty">Carregando...</div>';

    try {
      const res = await fetch(`/api/admin/complaints/${protocol}`, { headers: authHeaders() });
      if (await handleAuthError(res)) return;
      if (!res.ok) {
        detailPanel.innerHTML = '<div class="admin-detail-empty">Não foi possível carregar esta denúncia.</div>';
        return;
      }
      const data = await res.json();
      renderDetail(data);
    } catch (e) {
      detailPanel.innerHTML = '<div class="admin-detail-empty">Falha de conexão.</div>';
    }
  }

  function renderDetail(data) {
    const attachmentsHtml = data.attachments.length
      ? data.attachments.map(a => `
          <a class="attachment-link" href="/api/admin/complaints/${data.protocol}/attachments/${encodeURIComponent(a.storedName)}?token=${encodeURIComponent(token)}" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 3h5l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="#55555b" stroke-width="1.4"/></svg>
            ${escapeHtml(a.name)}
          </a>
        `).join('')
      : '<span class="submit-note">Nenhum anexo enviado.</span>';

    const threadHtml = data.messages.length
      ? data.messages.map(m => {
          const who = m.sender === 'psicologa' ? 'Você (psicóloga)' : 'Funcionário';
          return `<div class="msg from-${m.sender === 'psicologa' ? 'funcionario' : 'psicologa'}">
            <span class="msg-meta">${who} · ${formatDate(m.createdAt)}</span>${escapeHtml(m.content)}
          </div>`;
        }).join('')
      : '<div class="thread-empty">Nenhuma mensagem trocada ainda.</div>';
    // nota: invertemos as classes from-funcionario/from-psicologa de propósito,
    // para que no painel admin as mensagens DA PSICÓLOGA apareçam alinhadas
    // à direita (como "próprias"), e as do funcionário à esquerda.

    detailPanel.innerHTML = `
      <div class="detail-head">
        <div>
          <span class="eyebrow">${data.protocol}</span>
          <h2>${escapeHtml(data.type)}</h2>
          <span class="submit-note">Enviada em ${formatDate(data.createdAt)} · Atualizada em ${formatDate(data.updatedAt)}</span>
        </div>
        <div class="status-select-wrap">
          <select id="status-select">
            <option value="recebida">Recebida</option>
            <option value="em_analise">Em análise</option>
            <option value="respondida">Respondida</option>
            <option value="concluida">Concluída</option>
          </select>
        </div>
      </div>

      <div class="detail-block">
        <h3>Descrição enviada pelo funcionário</h3>
        <p class="detail-description">${escapeHtml(data.description)}</p>
      </div>

      <div class="detail-block">
        <h3>Anexos</h3>
        <div class="attachments-list">${attachmentsHtml}</div>
      </div>

      <div class="detail-block">
        <h3>Conversa</h3>
        <div class="thread" id="detail-thread">${threadHtml}</div>

        <form class="reply-box" id="detail-reply-form">
          <textarea id="detail-reply-content" placeholder="Escreva uma resposta para o funcionário..." required minlength="2"></textarea>
          <div class="form-error" id="detail-reply-error"></div>
          <div class="submit-row">
            <button type="submit" class="submit-btn" id="detail-reply-btn">
              <span class="spinner"></span>
              <span class="btn-label">Enviar resposta</span>
              <span class="dot"></span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('status-select').value = data.status;
    document.getElementById('status-select').addEventListener('change', (e) => updateStatus(data.protocol, e.target.value));

    document.getElementById('detail-reply-form').addEventListener('submit', (e) => sendReply(e, data.protocol));
  }

  async function updateStatus(protocol, status) {
    try {
      const res = await fetch(`/api/admin/complaints/${protocol}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (await handleAuthError(res)) return;
      await loadList();
    } catch (e) {
      // silencioso — o select volta ao valor anterior na próxima renderização
    }
  }

  async function sendReply(e, protocol) {
    e.preventDefault();
    const textarea = document.getElementById('detail-reply-content');
    const btn = document.getElementById('detail-reply-btn');
    const errorBox = document.getElementById('detail-reply-error');
    errorBox.classList.remove('show');

    const content = textarea.value.trim();
    if (content.length < 2) {
      errorBox.textContent = 'Escreva uma mensagem antes de enviar.';
      errorBox.classList.add('show');
      return;
    }

    btn.classList.add('is-loading');
    btn.disabled = true;

    try {
      const res = await fetch(`/api/admin/complaints/${protocol}/messages`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      });
      if (await handleAuthError(res)) return;
      const data = await res.json();
      if (!res.ok) {
        errorBox.textContent = data.error || 'Não foi possível enviar a resposta.';
        errorBox.classList.add('show');
        return;
      }
      await loadDetail(protocol);
      await loadList();
    } catch (err) {
      errorBox.textContent = 'Falha de conexão. Tente novamente.';
      errorBox.classList.add('show');
    } finally {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/admin';
  });

  loadList();
})();
