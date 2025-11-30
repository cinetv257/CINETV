// js/chat.js
import { auth, realtimeDb } from './firebase.js';
import { ref, push, onValue, off, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

let currentUser = null;
let currentChat = null;
let typingTimeout = null;

// Initialisation
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        initializeChat();
    } else {
        window.location.href = 'login.html';
    }
});

// Initialiser le chat
function initializeChat() {
    // Récupérer les paramètres de l'URL ou des données de session
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chat');
    const partnerId = urlParams.get('with');
    
    if (chatId && partnerId) {
        loadChat(chatId, partnerId);
    } else {
        // Rediriger vers la page des messages si aucun chat n'est spécifié
        window.location.href = 'messages.html';
    }
    
    setupEventListeners();
}

// Charger un chat spécifique
async function loadChat(chatId, partnerId) {
    currentChat = { id: chatId, partnerId: partnerId };
    
    // Charger les informations du partenaire (à implémenter)
    await loadPartnerInfo(partnerId);
    
    // Charger les messages
    loadMessages(chatId);
    
    // Écouter les événements de frappe
    listenToTyping(chatId);
}

// Charger les informations du partenaire
async function loadPartnerInfo(partnerId) {
    // Dans une vraie application, on récupérerait les données depuis Firestore
    // Pour l'instant, on utilise des données simulées
    document.getElementById('chatPartnerName').textContent = 'Utilisateur';
    document.getElementById('chatOnlineStatus').textContent = 'En ligne';
}

// Charger les messages
function loadMessages(chatId) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messagesRef = ref(realtimeDb, `conversations/${chatId}/messages`);
    
    onValue(messagesRef, (snapshot) => {
        chatMessages.innerHTML = '';
        
        if (!snapshot.exists()) {
            chatMessages.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments fa-2x"></i>
                    <p>Aucun message</p>
                    <p class="small">Envoyez le premier message !</p>
                </div>
            `;
            return;
        }
        
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Trier par timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Afficher les messages
        let lastDate = null;
        
        messages.forEach(message => {
            const messageDate = new Date(message.timestamp).toDateString();
            
            // Afficher la date si elle a changé
            if (messageDate !== lastDate) {
                const dateElement = document.createElement('div');
                dateElement.className = 'message-date';
                dateElement.textContent = formatMessageDate(message.timestamp);
                chatMessages.appendChild(dateElement);
                lastDate = messageDate;
            }
            
            const messageElement = createChatMessageElement(message);
            chatMessages.appendChild(messageElement);
        });
        
        // Scroll vers le bas
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Créer un élément message pour le chat
function createChatMessageElement(message) {
    const isCurrentUser = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        ${!isCurrentUser ? `
            <img src="assets/default-avatar.png" alt="Avatar" class="message-avatar">
        ` : ''}
        
        <div class="message-content">
            <div class="message-bubble">
                <p>${message.text}</p>
                <span class="message-time">${formatMessageTime(message.timestamp)}</span>
            </div>
        </div>
        
        ${isCurrentUser ? `
            <img src="assets/default-avatar.png" alt="Avatar" class="message-avatar">
        ` : ''}
    `;
    
    return messageElement;
}

// Écouter les événements de frappe
function listenToTyping(chatId) {
    const typingRef = ref(realtimeDb, `conversations/${chatId}/typing`);
    
    onValue(typingRef, (snapshot) => {
        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;
        
        if (snapshot.exists()) {
            const typingData = snapshot.val();
            // Supprimer l'utilisateur actuel de la liste
            delete typingData[currentUser.uid];
            
            const typingUsers = Object.keys(typingData);
            
            if (typingUsers.length > 0) {
                document.getElementById('typingUser').textContent = 'Quelqu\'un';
                typingIndicator.classList.remove('hidden');
            } else {
                typingIndicator.classList.add('hidden');
            }
        } else {
            typingIndicator.classList.add('hidden');
        }
    });
}

// Indiquer que l'utilisateur est en train d'écrire
function startTyping(chatId) {
    if (!currentChat) return;
    
    const typingRef = ref(realtimeDb, `conversations/${chatId}/typing/${currentUser.uid}`);
    set(typingRef, true);
    
    // Effacer après 3 secondes
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        stopTyping(chatId);
    }, 3000);
}

// Arrêter d'indiquer que l'utilisateur écrit
function stopTyping(chatId) {
    if (!currentChat) return;
    
    const typingRef = ref(realtimeDb, `conversations/${chatId}/typing/${currentUser.uid}`);
    set(typingRef, null);
}

// Envoyer un message
async function sendMessage(text) {
    if (!text.trim() || !currentChat) return;
    
    try {
        const messageData = {
            text: text.trim(),
            senderId: currentUser.uid,
            timestamp: Date.now(),
            read: false
        };
        
        const messagesRef = ref(realtimeDb, `conversations/${currentChat.id}/messages`);
        await push(messagesRef, messageData);
        
        // Arrêter l'indication de frappe
        stopTyping(currentChat.id);
        
        console.log("Message envoyé");
        
    } catch (error) {
        console.error("Erreur envoi message:", error);
        alert("Erreur lors de l'envoi du message");
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Envoi de message
    const chatMessageInput = document.getElementById('chatMessageInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    if (chatMessageInput && chatSendBtn) {
        chatSendBtn.addEventListener('click', () => {
            const text = chatMessageInput.value.trim();
            if (text) {
                sendMessage(text);
                chatMessageInput.value = '';
                chatMessageInput.style.height = 'auto';
            }
        });
        
        chatMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = chatMessageInput.value.trim();
                if (text) {
                    sendMessage(text);
                    chatMessageInput.value = '';
                    chatMessageInput.style.height = 'auto';
                }
            }
        });
        
        // Auto-resize du textarea
        chatMessageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            
            // Indiquer que l'utilisateur est en train d'écrire
            if (this.value.trim() && currentChat) {
                startTyping(currentChat.id);
            }
        });
        
        // Arrêter de taper quand le champ est vide
        chatMessageInput.addEventListener('blur', () => {
            if (currentChat) {
                stopTyping(currentChat.id);
            }
        });
    }
    
    // Bouton retour
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }
    
    // Actions de chat (appel, vidéo, etc.)
    const chatActions = document.querySelectorAll('.chat-actions .btn-icon');
    chatActions.forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.currentTarget.title;
            handleChatAction(action);
        });
    });
}

// Gérer les actions de chat
function handleChatAction(action) {
    switch (action) {
        case 'Appel vocal':
            alert('Fonctionnalité d\'appel vocal à implémenter');
            break;
        case 'Appel vidéo':
            alert('Fonctionnalité d\'appel vidéo à implémenter');
            break;
        case 'Plus d\'options':
            showChatOptions();
            break;
    }
}

// Afficher les options de chat
function showChatOptions() {
    // Implémenter un menu contextuel avec plus d'options
    alert('Plus d\'options à implémenter');
}

// Utilitaires
function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDate(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
        return 'Aujourd\'hui';
    } else if (date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString()) {
        return 'Hier';
    } else {
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
    }
}