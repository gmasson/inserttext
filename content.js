// Add debugging from the start to see exactly what's happening
console.log('Content script loaded');

// Variável para armazenar o último elemento focado
let lastFocusedElement = null;

// Atualiza a referência do último elemento focado
function updateLastFocusedElement(event) {
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || 
                   // Para lidar com divs do WhatsApp, que têm uma estrutura especial
                   (target.getAttribute('role') === 'textbox') || 
                   (target.parentElement && target.parentElement.getAttribute('role') === 'textbox'))) {
        lastFocusedElement = target;
        // Opcional: você pode registrar o foco para debug
        console.log('Último elemento focado atualizado:', target.tagName, target);
    }
}

// Captura o foco em qualquer elemento (captura em fase de captura)
document.addEventListener('focus', updateLastFocusedElement, true);
document.addEventListener('click', function(e) {
    // O WhatsApp e algumas outras aplicações não disparam eventos de foco corretamente
    // então vamos capturar cliques também
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
                     e.target.isContentEditable || 
                     e.target.getAttribute('role') === 'textbox' || 
                     (e.target.parentElement && e.target.parentElement.getAttribute('role') === 'textbox'))) {
        lastFocusedElement = e.target;
        console.log('Elemento focado por clique:', e.target.tagName, e.target);
    }
    
    // Detectar elementos do WhatsApp Web
    const composerDiv = e.target.closest('[data-lexical-editor="true"]');
    if (composerDiv) {
        lastFocusedElement = composerDiv;
        console.log('Elemento do WhatsApp detectado por clique:', composerDiv);
    }
}, true);

// Função para encontrar o elemento de entrada do WhatsApp
function findWhatsAppInputElement() {
    // WhatsApp Web usa diferentes seletores em suas versões
    const possibleSelectors = [
        '[data-lexical-editor="true"]', // Lexical editor (nova versão)
        '[contenteditable="true"][role="textbox"]', // Seletor comum
        '.selectable-text[contenteditable="true"]', // Versão mais antiga
        'div[role="textbox"][contenteditable="true"]', // Outro formato comum
        'div.copyable-text.selectable-text', // Ainda outro formato
        'footer div[contenteditable="true"]' // Posição específica
    ];
    
    for (const selector of possibleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            console.log('Elemento de entrada do WhatsApp encontrado:', element);
            return element;
        }
    }
    return null;
}

function insertTextAtCursor(text) {
    console.log('Attempting to insert text:', text.substring(0, 30) + '...');
    
    try {
        // Se não temos um elemento focado, tentar encontrar o elemento do WhatsApp
        if (!lastFocusedElement) {
            console.log('Nenhum elemento focado, procurando elemento do WhatsApp...');
            lastFocusedElement = findWhatsAppInputElement();
            
            if (!lastFocusedElement) {
                console.log('Nenhum elemento focado ou do WhatsApp encontrado');
                return false;
            }
        }
        
        console.log('Active element:', lastFocusedElement ? lastFocusedElement.tagName : 'NONE', 
                   'contentEditable:', lastFocusedElement ? lastFocusedElement.isContentEditable : false,
                   'role:', lastFocusedElement ? lastFocusedElement.getAttribute('role') : 'NONE');
        
        // Para elementos data-lexical-editor do WhatsApp (nova versão)
        if (lastFocusedElement.getAttribute('data-lexical-editor') === 'true') {
            console.log('Inserindo em editor Lexical (WhatsApp)');
            
            // Focar o elemento primeiro
            lastFocusedElement.focus();
            
            // Método específico para editor Lexical: inserir texto como evento de teclado
            const insertText = (text) => {
                // Usar execCommand para inserir texto
                document.execCommand('insertText', false, text);
                
                // Disparar evento personalizado que o WhatsApp pode estar monitorando
                const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
                lastFocusedElement.dispatchEvent(inputEvent);
            };
            
            insertText(text);
            return true;
        }

        // Para standard form fields (input/textarea)
        if (lastFocusedElement.tagName === 'INPUT' || lastFocusedElement.tagName === 'TEXTAREA') {
            console.log('Inserindo em campo de formulário');
            
            // Backup original values
            const originalValue = lastFocusedElement.value;
            const start = lastFocusedElement.selectionStart || 0;
            const end = lastFocusedElement.selectionEnd || 0;
            
            // Insert text
            const beforeText = originalValue.substring(0, start);
            const afterText = originalValue.substring(end);
            
            lastFocusedElement.value = beforeText + text + afterText;
            
            // Reposition cursor
            lastFocusedElement.selectionStart = lastFocusedElement.selectionEnd = start + text.length;
            
            // Fire events to notify frameworks like React, Angular, etc.
            const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
            const changeEvent = new Event('change', { bubbles: true });
            
            lastFocusedElement.dispatchEvent(inputEvent);
            lastFocusedElement.dispatchEvent(changeEvent);
            
            console.log('Text inserted into form field successfully');
            return true;
        }
        
        // Para elementos com role="textbox" (comum em aplicações como WhatsApp)
        if (lastFocusedElement.getAttribute('role') === 'textbox' || 
            lastFocusedElement.isContentEditable) {
            console.log('Inserindo em elemento contentEditable ou role="textbox"');
            
            // Focar o elemento primeiro
            lastFocusedElement.focus();
            
            // Usar execCommand como primeira tentativa para elementos contentEditable
            if (document.execCommand('insertText', false, text)) {
                console.log('Text inserted using execCommand successfully');
                
                // Disparar evento de input para notificar frameworks
                const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
                lastFocusedElement.dispatchEvent(inputEvent);
                
                return true;
            }
            
            // Se execCommand falhar, tentar método de seleção/range
            const selection = window.getSelection();
            
            if (selection && selection.rangeCount > 0) {
                // Save current state to restore in case of failure
                const originalRange = selection.getRangeAt(0).cloneRange();
                
                try {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    
                    // To preserve line breaks and formatting in HTML
                    if (text.includes('\n') || text.includes('<')) {
                        // Method 1: use temporary element to maintain HTML formatting
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = text.replace(/\n/g, '<br>');
                        
                        // Insert each child node to preserve HTML structure
                        const fragment = document.createDocumentFragment();
                        while (tempDiv.firstChild) {
                            fragment.appendChild(tempDiv.firstChild);
                        }
                        range.insertNode(fragment);
                    } else {
                        // Method 2: simple text
                        const textNode = document.createTextNode(text);
                        range.insertNode(textNode);
                        
                        // Move cursor to the end of inserted text
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                    }
                    
                    // Update selection
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // Fire input event
                    const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
                    lastFocusedElement.dispatchEvent(inputEvent);
                    
                    console.log('Text inserted into contentEditable successfully');
                    return true;
                } catch (err) {
                    console.error('contentEditable insertion error:', err);
                    // Restore original selection in case of error
                    selection.removeAllRanges();
                    selection.addRange(originalRange);
                }
            }
        }
        
        // Último recurso - tentar simular digitação através de eventos de teclado
        console.log('Tentativa de último recurso: simulação de evento de teclado');
        lastFocusedElement.focus();
        
        // Para cada caractere, simular um evento de teclado
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Criar e dispara eventos de teclado
            const keyDown = new KeyboardEvent('keydown', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                charCode: char.charCodeAt(0),
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true
            });
            
            const keyPress = new KeyboardEvent('keypress', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                charCode: char.charCodeAt(0),
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true
            });
            
            const keyUp = new KeyboardEvent('keyup', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                charCode: char.charCodeAt(0),
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true
            });
            
            lastFocusedElement.dispatchEvent(keyDown);
            lastFocusedElement.dispatchEvent(keyPress);
            lastFocusedElement.dispatchEvent(keyUp);
        }
        
        console.log('Keyboard event simulation completed');
        
        // Notificar que a inserção pode ter ocorrido
        return true;
        
    } catch (error) {
        console.error('InsertText Error:', error);
        return false;
    }
}

// Setup the message listener
console.log('Setting up message listener');
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received in content script:', request);
    
    // Simple ping to check if content script is loaded
    if (request.action === 'ping') {
        console.log('Received ping, sending pong');
        sendResponse({status: 'pong'});
        return true;
    }
    
    if (request.action === 'insertText') {
        try {
            if (!request.text) {
                console.error('No text provided for insertion');
                sendResponse({success: false, error: 'Nenhum texto fornecido'});
                return true;
            }
            
            const success = insertTextAtCursor(request.text);
            console.log('Insertion result:', success);
            sendResponse({success: success});
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({success: false, error: error.toString()});
        }
        return true;
    }
    
    sendResponse({success: false, error: 'Ação desconhecida'});
    return true;
});

// Send a message to background to confirm content script is loaded
console.log('Notifying background that content script is loaded');
chrome.runtime.sendMessage({action: 'contentScriptLoaded'}, function(response) {
    console.log('Background acknowledged content script:', response);
});