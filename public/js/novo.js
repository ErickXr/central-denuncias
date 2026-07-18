document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('denuncia-form');
    const fileInput = document.getElementById('attachments');
    const fileList = document.getElementById('file-list');
    const submitBtn = document.getElementById('submit-btn');

    const hasDeptCheckbox = document.getElementById('has-department');
    const deptGroup = document.getElementById('department-group');

    let selectedFiles = [];

    hasDeptCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            deptGroup.classList.remove('hidden');
        } else {
            deptGroup.classList.add('hidden');
            document.getElementById('department').value = '';
        }
    });

    fileInput.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files);
        
        if (selectedFiles.length + newFiles.length > 6) {
            alert('Você pode anexar no máximo 6 arquivos.');
            fileInput.value = '';
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
        for (let file of newFiles) {
            if (!validTypes.includes(file.type)) {
                alert(`O arquivo ${file.name} possui um formato não suportado.`);
                fileInput.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert(`O arquivo ${file.name} excede o limite de 10MB.`);
                fileInput.value = '';
                return;
            }
            selectedFiles.push(file);
        }

        renderFileList();
    });

    function renderFileList() {
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }
        fileList.innerHTML = selectedFiles.map((file, index) => 
            `<div>📄 ${file.name} <button type="button" onclick="removeFile(${index})" style="background:none;border:none;color:red;cursor:pointer;margin-left:10px;">X</button></div>`
        ).join('');
    }

    window.removeFile = (index) => {
        selectedFiles.splice(index, 1);
        renderFileList();
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('type').value;
        const department = document.getElementById('department').value;
        const description = document.getElementById('description').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;

        if (password !== passwordConfirm) {
            alert('As senhas não coincidem!');
            return;
        }

        if (password.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (hasDeptCheckbox.checked && !department) {
            alert('Por favor, selecione o departamento.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        const formData = new FormData();
        formData.append('type', type);
        if (hasDeptCheckbox.checked && department) {
            formData.append('department', department);
        }
        formData.append('description', description);
        formData.append('password', password);

        selectedFiles.forEach(file => {
            formData.append('anexos', file);
        });

        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao enviar.');
            }

            // Esconder form, mostrar protocolo
            document.getElementById('form-section').classList.add('hidden');
            document.getElementById('success-section').classList.remove('hidden');
            document.getElementById('protocol-display').textContent = data.protocol;

            // Limpa form para segurança
            form.reset();
            selectedFiles = [];

        } catch (error) {
            alert(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Denúncia Anônima';
        }
    });
});
