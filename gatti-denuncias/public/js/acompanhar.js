/* ============================================================================
   CENTRAL DE DENÚNCIAS — GATTI
   Lógica da página de acompanhamento (login com protocolo + senha)
   ============================================================================ */

(function () {
  const TOKEN_KEY = 'gatti_employee_token';

  const loginSection = document.getElementById('login-section');
  const statusSection = document.getElementById('status-section');
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');

  const statusPill = document.getElementById('status-pill');
  const statusProtocol = document.getElementById('status-protocol');
  const statusType = document.getElementById('status-type');
  const statusDate = document.getElementById('status-date');
  const statusDescription = document.getElementById('status-description');
  const attachmentsBlock = document.getElementById('status-attachments-block');
  const attachmentsList = document.getElementById('status-attachments-list');
  const threadEl = document.getElementById('thread');

  const replyForm = document.getElementById('reply-form');
  const replyBtn = document.getElementById('reply-btn');
  const replyError = document.getElementById('reply-error');
  const logoutBtn = document.getElementById('logout-btn');

  document.getElementById('year').textContent = new Date().getFullYear();

  const STATUS_LABELS = {
    recebida: 'Recebida',
    em_analise: 'Em análise',
    respondida: 'Respondida',
    concluida: 'Concluída',
  };

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  function renderThread(messages) {
    threadEl.innerHTML = '';
    if (!messages.length) {
      threadEl.innerHTML = '<div class="thread-empty">Nenhuma mensagem ainda. Assim que houver uma resposta, ela aparecerá aqui.</div>';
      return;
    }
    messages.forEach(m => {
      const bubble = document.createElement('div');
      bubble.className = `msg from-${m.sender}`;
      const who = m.sender === 'funcionario' ? 'Você' : 'Psicóloga responsável';
      bubble.innerHTML = `<span class="msg-meta">${who} · ${formatDate(m.createdAt)}</span>${escapeHtml(m.content)}`;
      threadEl.appendChild(bubble);
    });
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadStatus() {
    const token = getToken();
    if (!token) return showLogin();

    try {
      const res = await fetch('/api/complaints/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        clearToken();
        return showLogin('Sua sessão expirou. Faça login novamente.');
      }
      const data = await res.json();
      renderStatus(data);
    } catch (e) {
      showLogin('Falha de conexão. Tente novamente.');
    }
  }

  function renderStatus(data) {
    loginSection.style.display = 'none';
    statusSection.style.display = 'block';

    statusProtocol.textContent = data.protocol;
    statusType.textContent = data.type;
    statusDate.textContent = `Enviada em ${formatDate(data.createdAt)}`;
    statusDescription.textContent = data.description;

    statusPill.className = `status-pill status-${data.status}`;
    statusPill.textContent = STATUS_LABELS[data.status] || data.status;

    if (data.attachments && data.attachments.length) {
      attachmentsBlock.style.display = 'block';
      attachmentsList.textContent = data.attachments.join(', ');
    } else {
      attachmentsBlock.style.display = 'none';
    }

    renderThread(data.messages || []);
  }

  function showLogin(msg) {
    loginSection.style.display = 'block';
    statusSection.style.display = 'none';
    if (msg) {
      loginError.textContent = msg;
      loginError.classList.add('show');
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('show');

    const protocol = document.getElementById('protocol').value.trim();
    const senha = document.getElementById('senha').value;

    if (!protocol || !senha) {
      loginError.textContent = 'Preencha o protocolo e a senha.';
      loginError.classList.add('show');
      return;
    }

    loginBtn.classList.add('is-loading');
    loginBtn.disabled = true;

    try {
      const res = await fetch('/api/complaints/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.error || 'Não foi possível entrar.';
        loginError.classList.add('show');
        return;
      }
      setToken(data.token);
      await loadStatus();
    } catch (err) {
      loginError.textContent = 'Falha de conexão. Tente novamente.';
      loginError.classList.add('show');
    } finally {
      loginBtn.classList.remove('is-loading');
      loginBtn.disabled = false;
    }
  });

  replyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    replyError.classList.remove('show');

    const content = document.getElementById('reply-content').value.trim();
    if (content.length < 2) {
      replyError.textContent = 'Escreva uma mensagem antes de enviar.';
      replyError.classList.add('show');
      return;
    }

    replyBtn.classList.add('is-loading');
    replyBtn.disabled = true;

    try {
      const res = await fetch('/api/complaints/me/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        replyError.textContent = data.error || 'Não foi possível enviar a mensagem.';
        replyError.classList.add('show');
        return;
      }
      document.getElementById('reply-content').value = '';
      await loadStatus();
    } catch (err) {
      replyError.textContent = 'Falha de conexão. Tente novamente.';
      replyError.classList.add('show');
    } finally {
      replyBtn.classList.remove('is-loading');
      replyBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', () => {
    clearToken();
    showLogin();
  });

  // tenta carregar automaticamente se já houver sessão salva
  loadStatus();
})();
