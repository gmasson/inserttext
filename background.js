console.log('Background script loaded');

// Responde às mensagens da popup e content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    // Confirmação de carregamento do content script
    if (request.action === 'contentScriptLoaded') {
        console.log('Content script loaded in tab:', sender.tab?.id);
        sendResponse({status: 'acknowledged'});
        return true;
    }
    
    // Processamento do comando para inserir texto
    if (request.action === 'insertText') {
        console.log('Processing insertText request');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                console.error('No active tab found');
                sendResponse({success: false, error: 'Nenhuma aba ativa encontrada'});
                return;
            }
            
            const tabId = tabs[0].id;
            console.log('Sending message to tab:', tabId);
            
            // First, check if we can send a message to the content script
            chrome.tabs.sendMessage(tabId, {action: 'ping'}, function(pingResponse) {
                if (chrome.runtime.lastError) {
                    console.log('Content script not available, injecting it first');
                    
                    // Content script isn't ready, let's inject it
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    }).then(() => {
                        // Give it a moment to initialize
                        setTimeout(() => {
                            // Now send the actual insert command
                            chrome.tabs.sendMessage(tabId, {
                                action: 'insertText', 
                                text: request.text
                            }, function(response) {
                                if (chrome.runtime.lastError) {
                                    console.error('Error after injection:', chrome.runtime.lastError);
                                    sendResponse({
                                        success: false, 
                                        error: 'Falha ao inserir texto após injetar o script'
                                    });
                                } else {
                                    sendResponse(response);
                                }
                            });
                        }, 500); // Aumentado o tempo de espera para dar mais tempo para o script ser inicializado
                    }).catch(err => {
                        console.error('Script injection failed:', err);
                        sendResponse({
                            success: false, 
                            error: 'Falha ao injetar o script: ' + err.message
                        });
                    });
                } else {
                    // Content script is available, send the message directly
                    chrome.tabs.sendMessage(tabId, {
                        action: 'insertText', 
                        text: request.text
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.error('Error sending message:', chrome.runtime.lastError);
                            sendResponse({
                                success: false, 
                                error: 'Erro ao comunicar com a página: ' + chrome.runtime.lastError.message
                            });
                        } else {
                            sendResponse(response);
                        }
                    });
                }
            });
        });
        
        return true; // Keep the message channel open for the async response
    }
    
    return true; // Always return true for async responses
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed or updated');
});