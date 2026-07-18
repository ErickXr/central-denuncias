/* ============================================================================
   CENTRAL DE DENÚNCIAS — GATTI
   Lógica da página de envio de nova denúncia
   ============================================================================ */

(function () {
  const form = document.getElementById('report-form');
  const formView = document.getElementById('form-view');
  const successView = document.getElementById('success-view');
  const submitBtn = document.getElementById('submit-btn');
  const errorBox = document.getElementById('form-error');
  const descricao = document.getElementById('descricao');
  const charCurrent = document.getElementById('char-current');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('anexos');
  const fileListEl = document.getElementById('file-list');
  const protocolCode = document.getElementById('protocol-code');
  const newReportLink = document.getElementById('new-report');

  document.getElementById('year').textContent = new Date().getFullYear();

  descricao.addEventListener('input', () => {
    charCurrent.textContent = descricao.value.length;
  });

  // ---------- upload de arquivos ----------
  let dt = new DataTransfer();

  function renderFileList() {
    fileListEl.innerHTML = '';
    Array.from(dt.files).forEach((file, idx) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      const kb = (file.size / 1024).toFixed(0);
      chip.innerHTML = `
        <span class="name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M8 3h5l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="#55555b" stroke-width="1.4"/></svg>
          <span title="${file.name}">${file.name}</span>
          <span style="color:#9a9a9e; flex-shrink:0;">${kb} KB</span>
        </span>
        <button type="button" aria-label="Remover arquivo" data-idx="${idx}">×</button>
      `;
      fileListEl.appendChild(chip);
    });
    fileInput.files = dt.files;
  }

  fileInput.addEventListener('change', () => {
    Array.from(fileInput.files).forEach(f => dt.items.add(f));
    renderFileList();
  });

  fileListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-idx]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    const newDt = new DataTransfer();
    Array.from(dt.files).forEach((f, i) => { if (i !== idx) newDt.items.add(f); });
    dt = newDt;
    renderFileList();
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', (e) => {
    Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
    renderFileList();
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('show');
  }

  // ---------- envio ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const tipo = document.getElementById('tipo').value;
    const desc = descricao.value.trim();
    const senha = document.getElementById('senha').value;
    const senhaConfirma = document.getElementById('senha-confirma').value;
    const anonimo = document.getElementById('anonimo').checked;

    if (!tipo) return showError('Selecione o tipo de ocorrência.');
    if (desc.length < 20) return showError('Descreva os fatos com um pouco mais de detalhe (mínimo de 20 caracteres).');
    if (senha.length < 6) return showError('A senha de acompanhamento precisa ter pelo menos 6 caracteres.');
    if (senha !== senhaConfirma) return showError('As senhas não coincidem.');

    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('descricao', desc);
    formData.append('senha', senha);
    formData.append('anonimo', anonimo);
    Array.from(dt.files).forEach(file => formData.append('anexos', file));

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/complaints', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        protocolCode.textContent = data.protocol;
        formView.style.display = 'none';
        successView.classList.add('show');
      } else {
        showError(data.error || 'Não foi possível enviar sua denúncia agora. Tente novamente em instantes.');
      }
    } catch (err) {
      showError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });

  newReportLink.addEventListener('click', () => {
    form.reset();
    dt = new DataTransfer();
    renderFileList();
    charCurrent.textContent = '0';
    document.getElementById('anonimo').checked = true;
    successView.classList.remove('show');
    formView.style.display = 'block';
    window.scrollTo({ top: document.getElementById('denuncia').offsetTop - 20, behavior: 'smooth' });
  });
})();
