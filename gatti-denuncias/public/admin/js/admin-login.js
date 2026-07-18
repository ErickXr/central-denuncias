/* ============================================================================
   CENTRAL DE DENÚNCIAS — GATTI — PAINEL ADMIN
   Lógica de login da psicóloga / equipe responsável
   ============================================================================ */

(function () {
  const TOKEN_KEY = 'gatti_admin_token';
  const USER_KEY = 'gatti_admin_username';

  document.getElementById('year').textContent = new Date().getFullYear();

  // se já existe sessão válida, vai direto para o dashboard
  if (localStorage.getItem(TOKEN_KEY)) {
    window.location.href = '/admin/dashboard';
    return;
  }

  const form = document.getElementById('admin-login-form');
  const btn = document.getElementById('login-btn');
  const errorBox = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');

    const username = document.getElementById('username').value.trim();
    const senha = document.getElementById('senha').value;

    if (!username || !senha) {
      errorBox.textContent = 'Preencha usuário e senha.';
      errorBox.classList.add('show');
      return;
    }

    btn.classList.add('is-loading');
    btn.disabled = true;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, senha }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorBox.textContent = data.error || 'Não foi possível entrar.';
        errorBox.classList.add('show');
        return;
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, data.username);
      window.location.href = '/admin/dashboard';
    } catch (err) {
      errorBox.textContent = 'Falha de conexão. Tente novamente.';
      errorBox.classList.add('show');
    } finally {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  });
})();
