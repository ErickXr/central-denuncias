document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao logar');

            localStorage.setItem('gatti_admin_user', data.username);
            
            // Retorna para a rota pai correta (ex: /gestao-interna/login -> /gestao-interna)
            const currentPath = window.location.pathname;
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            window.location.href = parentPath || '/';
        } catch (error) {
            alert(error.message);
        }
    });
});
