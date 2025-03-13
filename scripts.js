// Script para gerenciamento das abas, busca dinâmica e CRUD dos blocos de textos
document.addEventListener('DOMContentLoaded', function () {
    // Estado global
    let textos = JSON.parse(localStorage.getItem('easytext_blocks') || '[]');
    let currentEditId = null;

    // Função para salvar no localStorage
    function saveToStorage() {
        localStorage.setItem('easytext_blocks', JSON.stringify(textos));
    }

    // Função para limpar formulário
    function clearForm() {
        document.getElementById('novo-titulo').value = '';
        document.getElementById('novo-texto').value = '';
        document.getElementById('novo-tags').value = '';
        document.getElementById('newBlockForm').classList.add('hidden');
        document.getElementById('btn-excluir-bloco').classList.add('hidden');
        document.getElementById('newBlockForm').dataset.editId = '';
        currentEditId = null;
    }

    // Função para popular o formulário de edição
    function populateEditForm(texto) {
        document.getElementById('novo-titulo').value = texto.titulo || '';
        document.getElementById('novo-texto').value = texto.conteudo || '';
        document.getElementById('novo-tags').value = texto.tags || '';
        document.getElementById('newBlockForm').classList.remove('hidden');
        document.getElementById('newBlockForm').dataset.editId = texto.id;
        document.getElementById('btn-excluir-bloco').classList.remove('hidden');
        currentEditId = texto.id;
    }

    // Função para renderizar a lista de textos
    function renderTextos(filter = '') {
        const textosList = document.getElementById('textos-list');
        textosList.innerHTML = '';
        
        const filteredTexts = textos.filter(texto => {
            const searchTerm = filter.toLowerCase();
            return (texto.titulo || '').toLowerCase().includes(searchTerm) ||
                   (texto.conteudo || '').toLowerCase().includes(searchTerm) ||
                   (texto.tags || '').toLowerCase().includes(searchTerm);
        });

        filteredTexts.forEach(texto => {
            const div = document.createElement('div');
            div.className = 'text-block';
            div.innerHTML = `
                <span>${texto.titulo || 'Sem título'}</span>
                <div class="actions">
                    <button class="btn-inserir" data-id="${texto.id}">Inserir</button>
                    <button class="btn-editar" data-id="${texto.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                </div>
            `;
            textosList.appendChild(div);
        });
    }

    // Função para excluir bloco
    function deleteBlock(id) {
        if (confirm('Tem certeza que deseja excluir este bloco?')) {
            textos = textos.filter(t => t.id !== parseInt(id));
            saveToStorage();
            renderTextos();
            clearForm();
        }
    }

    // Gerenciamento de abas
    function showTab(tabId) {
        const tabs = {
            'tab-textos': document.getElementById('section-textos'),
            'tab-manual': document.getElementById('section-manual'),
            'tab-import-export': document.getElementById('section-import-export')
        };

        Object.keys(tabs).forEach(key => {
            if (key === tabId) {
                tabs[key].classList.remove('hidden');
                document.getElementById(key).classList.add('active');
            } else {
                tabs[key].classList.add('hidden');
                document.getElementById(key).classList.remove('active');
            }
        });
    }

    // Event listeners para as abas
    document.getElementById('tab-textos').addEventListener('click', () => showTab('tab-textos'));
    document.getElementById('tab-manual').addEventListener('click', () => showTab('tab-manual'));
    document.getElementById('tab-import-export').addEventListener('click', () => showTab('tab-import-export'));

    // Event listener para lista de textos
    document.getElementById('textos-list').addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const id = parseInt(button.dataset.id);
        const texto = textos.find(t => t.id === id);
        if (!texto) return;

        if (button.classList.contains('btn-inserir')) {
            try {
                // Mostra feedback visual
                const originalText = button.textContent;
                button.textContent = 'Inserindo...';
                button.disabled = true;
                
                // Correção: Use chrome.runtime.sendMessage ao invés de acesso direto
                chrome.runtime.sendMessage({
                    action: 'insertText',
                    text: texto.conteudo
                }, function(response) {
                    // Restaura o botão
                    button.disabled = false;
                    
                    if (chrome.runtime.lastError) {
                        console.error("Error:", chrome.runtime.lastError);
                        button.textContent = originalText;
                        alert('Erro: ' + (chrome.runtime.lastError.message || 'Falha na comunicação com a extensão'));
                        return;
                    }
                    
                    if (response && response.success) {
                        // Feedback de sucesso temporário
                        button.textContent = '✓ Inserido!';
                        setTimeout(() => {
                            button.textContent = originalText;
                        }, 1500);
                        
                        // Fecha o popup após sucesso
                        setTimeout(() => window.close(), 1000);
                    } else {
                        button.textContent = originalText;
                        const errorMsg = response?.error || 'Erro ao inserir texto. Certifique-se de ter um campo de texto selecionado.';
                        alert(errorMsg);
                    }
                });
            } catch (err) {
                console.error('Error:', err);
                button.textContent = 'Inserir';
                button.disabled = false;
                alert('Erro ao comunicar com a extensão: ' + err.message);
            }
        } else if (button.classList.contains('btn-editar')) {
            populateEditForm(texto);
        }
    });

    // Inserção manual
    document.getElementById('btn-inserir-manual').addEventListener('click', function() {
        const manualText = document.getElementById('manual-text').value;
        if (!manualText) {
            alert('Digite algum texto para inserir.');
            return;
        }

        try {
            // Mostra feedback visual
            const button = document.getElementById('btn-inserir-manual');
            const originalText = button.textContent;
            button.textContent = 'Inserindo...';
            button.disabled = true;
            
            // Correção: Use chrome.runtime.sendMessage
            chrome.runtime.sendMessage({
                action: 'insertText',
                text: manualText
            }, function(response) {
                // Restaura o botão
                button.disabled = false;
                
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError);
                    button.textContent = originalText;
                    alert('Erro: ' + (chrome.runtime.lastError.message || 'Falha na comunicação com a extensão'));
                    return;
                }
                
                if (response && response.success) {
                    // Feedback de sucesso temporário
                    button.textContent = '✓ Inserido!';
					
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1500);
                    
                    // Fecha o popup após sucesso
                    setTimeout(() => window.close(), 1000);
                } else {
                    button.textContent = originalText;
                    const errorMsg = response?.error || 'Erro ao inserir texto. Certifique-se de ter um campo de texto selecionado.';
                    alert(errorMsg);
                }
            });
        } catch (err) {
            console.error('Error:', err);
            document.getElementById('btn-inserir-manual').textContent = 'Inserir Texto';
            document.getElementById('btn-inserir-manual').disabled = false;
            alert('Erro ao comunicar com a extensão: ' + err.message);
        }
    });

    // Busca dinâmica
    document.getElementById('search').addEventListener('input', function(e) {
        renderTextos(e.target.value);
    });

    // Exibir formulário para novo bloco
    document.getElementById('btn-novo-bloco').addEventListener('click', () => {
        clearForm();
        document.getElementById('newBlockForm').classList.remove('hidden');
    });

    // Salvar bloco
    document.getElementById('btn-salvar-bloco').addEventListener('click', () => {
        const titulo = document.getElementById('novo-titulo').value.trim();
        const conteudo = document.getElementById('novo-texto').value.trim();
        const tags = document.getElementById('novo-tags').value.trim();
        const editId = document.getElementById('newBlockForm').dataset.editId;

        if (!titulo || !conteudo) {
            alert('Preencha pelo menos o título e o texto.');
            return;
        }

        if (editId) {
            // Modo edição
            const index = textos.findIndex(t => t.id === parseInt(editId));
            if (index !== -1) {
                textos[index] = { 
                    ...textos[index], 
                    titulo, 
                    conteudo, 
                    tags,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            // Modo novo bloco
            const novoId = textos.length ? Math.max(...textos.map(t => t.id)) + 1 : 1;
            textos.push({ 
                id: novoId, 
                titulo, 
                conteudo, 
                tags,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        saveToStorage();
        renderTextos();
        clearForm();
    });

    // Excluir bloco
    document.getElementById('btn-excluir-bloco').addEventListener('click', () => {
        const editId = document.getElementById('newBlockForm').dataset.editId;
        if (editId) {
            deleteBlock(editId);
        }
    });

    // Exportar textos
    document.getElementById('btn-exportar').addEventListener('click', () => {
        if (textos.length === 0) {
            alert('Não há textos para exportar.');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(textos));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `textos_inserttext_${timestamp}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Importar textos
    document.getElementById('btn-importar').addEventListener('click', () => {
        const fileInput = document.getElementById('importar-arquivo');
        if (!fileInput.files.length) {
            alert('Selecione um arquivo para importar.');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedTexts = JSON.parse(e.target.result);
                if (Array.isArray(importedTexts)) {
                    // Garante IDs únicos
                    const currentMaxId = textos.length ? Math.max(...textos.map(t => t.id)) : 0;
                    const adjustedTexts = importedTexts.map((text, index) => ({
                        ...text,
                        id: currentMaxId + index + 1
                    }));
                    
                    // Mesclando ou substituindo
                    if (confirm('Deseja mesclar com os textos existentes? Cancelar irá substituir todos os textos.')) {
                        textos = [...textos, ...adjustedTexts];
                    } else {
                        textos = adjustedTexts;
                    }
                    
                    saveToStorage();
                    renderTextos();
                    alert('Textos importados com sucesso.');
                    fileInput.value = '';
                } else {
                    alert('Formato inválido. O arquivo deve conter um array JSON.');
                }
            } catch(err) {
                console.error('Error parsing JSON:', err);
                alert('Erro ao importar os textos. Verifique se o arquivo está no formato correto.');
            }
        };
        reader.readAsText(file);
    });

    // Inicialização
    renderTextos();
    showTab('tab-textos');
});