// js/messages.js
import { auth, db, realtimeDb } from './firebase.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    addDoc,
    serverTimestamp,
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { ref, set, onValue, off, push } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

let currentUser = null;
let currentConversation = null;
let conversations = [];

// Initialisation
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadConversations();
        setupEventListeners();
    } else {
        window.location.href = 'login.html';
    }
});

// Charger les conversations
async function loadConversations() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        const friends = userData.friends || [];
        const conversationsList = document.getElementById('conversationsList');
        
        if (!conversationsList) return;
        
        conversationsList.innerHTML = '';
        
        if (friends.length === 0) {
            conversationsList.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-comments"></i>
                    <p>Aucune conversation</p>
                    <p class="small">Ajoutez des amis pour commencer à discuter</p>
                </div>
            `;
            return;
        }
        
        // Pour chaque ami, créer une conversation
        for (const friendId of friends) {
            const friendData = await getUserData(friendId);
            if (friendData) {
                const conversation = await createConversation(friendData);
                conversations.push(conversation);
                conversationsList.appendChild(conversation.element);
            }
        }
        
    } catch (error) {
        console.error("Erreur chargement conversations:", error);
    }
}

// Créer une conversation
async function createConversation(friendData) {
    const conversationId = generateConversationId(currentUser.uid, friendData.uid);
    
    // Élément DOM pour la conversation
    const element = document.createElement('div');
    element.className = 'conversation-item';
    element.innerHTML = `
        <img src="${friendData.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="conversation-avatar">
        <div class="conversation-info">
            <div class="conversation-name">${friendData.displayName}</div>
            <div class="conversation-preview" id="preview-${conversationId}">Aucun message</div>
        </div>
        <div class="conversation-meta">
            <div class="conversation-time" id="time-${conversationId}"></div>
            <div class="unread-count hidden" id="unread-${conversationId}">0</div>
        </div>
    `;
    
    // Écouter les nouveaux messages pour cette conversation
    listenToMessages(conversationId, friendData);
    
    // Gérer le clic sur la conversation
    element.addEventListener('click', () => {
        openConversation(conversationId, friendData);
    });
    
    return {
        id: conversationId,
        friend: friendData,
        element: element,
        lastMessage: null
    };
}

// Ouvrir une conversation
function openConversation(conversationId, friendData) {
    currentConversation = { id: conversationId, friend: friendData };
    
    // Mettre à jour l'interface
    document.querySelector('.no-conversation-selected').classList.add('hidden');
    document.getElementById('activeConversation').classList.remove('hidden');
    
    // Mettre à jour les informations du partenaire
    document.getElementById('partnerName').textContent = friendData.displayName;
    document.querySelector('.conversation-partner img').src = friendData.profilePic || 'assets/default-avatar.png';
    
    // Charger les messages
    loadMessages(conversationId);
    
    // Marquer comme lu
    markAsRead(conversationId);
    
    // Mettre à jour le style de la conversation active
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[onclick*="${conversationId}"]`) || 
                      Array.from(document.querySelectorAll('.conversation-item'))
                           .find(item => item.querySelector('.conversation-name').textContent === friendData.displayName);
    
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Charger les messages d'une conversation
function loadMessages(conversationId) {
    const messagesArea = document.getElementById('messagesArea');
    if (!messagesArea) return;
    
    messagesArea.innerHTML = '<div class="loading-messages">Chargement des messages...</div>';
    
    const messagesRef = ref(realtimeDb, `conversations/${conversationId}/messages`);
    
    onValue(messagesRef, (snapshot) => {
        messagesArea.innerHTML = '';
        
        if (!snapshot.exists()) {
            messagesArea.innerHTML = `
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
                messagesArea.appendChild(dateElement);
                lastDate = messageDate;
            }
            
            const messageElement = createMessageElement(message);
            messagesArea.appendChild(messageElement);
        });
        
        // Scroll vers le bas
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
}

// Créer un élément message
function createMessageElement(message) {
    const isCurrentUser = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        ${!isCurrentUser ? `
            <img src="${currentConversation.friend.profilePic || 'assets/default-avatar.png'}" 
                 alt="Avatar" class="message-avatar">
        ` : ''}
        
        <div class="message-content">
            <div class="message-bubble">
                <p>${message.text}</p>
                <span class="message-time">${formatMessageTime(message.timestamp)}</span>
            </div>
        </div>
        
        ${isCurrentUser ? `
            <img src="${getCurrentUserAvatar()}" alt="Avatar" class="message-avatar">
        ` : ''}
    `;
    
    return messageElement;
}

// Écouter les nouveaux messages
function listenToMessages(conversationId, friendData) {
    const messagesRef = ref(realtimeDb, `conversations/${conversationId}/messages`);
    
    onValue(messagesRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push(childSnapshot.val());
        });
        
        // Dernier message
        const lastMessage = messages[messages.length - 1];
        
        // Mettre à jour l'aperçu
        updateConversationPreview(conversationId, lastMessage, friendData);
    });
}

// Mettre à jour l'aperçu de la conversation
function updateConversationPreview(conversationId, lastMessage, friendData) {
    const previewElement = document.getElementById(`preview-${conversationId}`);
    const timeElement = document.getElementById(`time-${conversationId}`);
    
    if (previewElement && lastMessage) {
        previewElement.textContent = lastMessage.text.length > 30 ? 
            lastMessage.text.substring(0, 30) + '...' : lastMessage.text;
    }
    
    if (timeElement && lastMessage) {
        timeElement.textContent = formatMessageTime(lastMessage.timestamp, true);
    }
    
    // Mettre à jour le compteur de messages non lus si la conversation n'est pas active
    if (currentConversation?.id !== conversationId && lastMessage?.senderId !== currentUser.uid) {
        updateUnreadCount(conversationId, true);
    }
}

// Mettre à jour le compteur de messages non lus
function updateUnreadCount(conversationId, increment = false) {
    const unreadElement = document.getElementById(`unread-${conversationId}`);
    
    if (unreadElement) {
        if (increment) {
            const currentCount = parseInt(unreadElement.textContent) || 0;
            unreadElement.textContent = currentCount + 1;
            unreadElement.classList.remove('hidden');
        } else {
            unreadElement.textContent = '0';
            unreadElement.classList.add('hidden');
        }
    }
}

// Marquer comme lu
function markAsRead(conversationId) {
    updateUnreadCount(conversationId, false);
}

// Envoyer un message
async function sendMessage(text) {
    if (!text.trim() || !currentConversation) return;
    
    try {
        const messageData = {
            text: text.trim(),
            senderId: currentUser.uid,
            timestamp: Date.now(),
            read: false
        };
        
        const messagesRef = ref(realtimeDb, `conversations/${currentConversation.id}/messages`);
        await push(messagesRef, messageData);
        
        // Mettre à jour le dernier message dans Firestore pour la recherche
        await updateDoc(doc(db, 'users', currentUser.uid), {
            [`lastMessages.${currentConversation.id}`]: {
                text: text.trim(),
                timestamp: serverTimestamp(),
                with: currentConversation.friend.uid
            }
        });
        
        console.log("Message envoyé");
        
    } catch (error) {
        console.error("Erreur envoi message:", error);
        alert("Erreur lors de l'envoi du message");
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Nouveau message
    const newMessageBtn = document.getElementById('newMessageBtn');
    const startConversationBtn = document.getElementById('startConversationBtn');
    
    if (newMessageBtn) {
        newMessageBtn.addEventListener('click', showNewMessageModal);
    }
    
    if (startConversationBtn) {
        startConversationBtn.addEventListener('click', showNewMessageModal);
    }
    
    // Envoi de message
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    if (messageInput && sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            const text = messageInput.value.trim();
            if (text) {
                sendMessage(text);
                messageInput.value = '';
                messageInput.style.height = 'auto';
            }
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = messageInput.value.trim();
                if (text) {
                    sendMessage(text);
                    messageInput.value = '';
                    messageInput.style.height = 'auto';
                }
            }
        });
        
        // Auto-resize du textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
    
    // Modal nouveau message
    const closeModal = document.getElementById('closeModal');
    const cancelNewMessage = document.getElementById('cancelNewMessage');
    const startNewMessage = document.getElementById('startNewMessage');
    
    if (closeModal) closeModal.addEventListener('click', hideNewMessageModal);
    if (cancelNewMessage) cancelNewMessage.addEventListener('click', hideNewMessageModal);
    
    if (startNewMessage) {
        startNewMessage.addEventListener('click', () => {
            const selectedFriend = document.querySelector('.friend-select-item.selected');
            if (selectedFriend) {
                const friendId = selectedFriend.dataset.uid;
                startNewConversation(friendId);
            } else {
                alert('Veuillez sélectionner un ami');
            }
        });
    }
    
    // Recherche dans les conversations
    const conversationsSearch = document.getElementById('conversationsSearch');
    if (conversationsSearch) {
        conversationsSearch.addEventListener('input', searchConversations);
    }
    
    // Recherche dans le modal
    const recipientSearch = document.getElementById('recipientSearch');
    if (recipientSearch) {
        recipientSearch.addEventListener('input', searchFriendsForModal);
    }
}

// Afficher le modal nouveau message
async function showNewMessageModal() {
    const modal = document.getElementById('newMessageModal');
    if (modal) {
        modal.classList.remove('hidden');
        await loadFriendsForModal();
    }
}

// Cacher le modal nouveau message
function hideNewMessageModal() {
    const modal = document.getElementById('newMessageModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Charger les amis pour le modal
async function loadFriendsForModal() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        const friends = userData.friends || [];
        
        const modalFriendsList = document.getElementById('modalFriendsList');
        if (!modalFriendsList) return;
        
        modalFriendsList.innerHTML = '';
        
        for (const friendId of friends) {
            const friendData = await getUserData(friendId);
            if (friendData) {
                const friendElement = document.createElement('div');
                friendElement.className = 'friend-select-item';
                friendElement.dataset.uid = friendId;
                friendElement.innerHTML = `
                    <img src="${friendData.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="user-avatar-small">
                    <div class="friend-select-info">
                        <h4>${friendData.displayName}</h4>
                        <p>${friendData.bio || 'Membre Zyra'}</p>
                    </div>
                    <div class="friend-select-check">
                        <i class="fas fa-check"></i>
                    </div>
                `;
                
                friendElement.addEventListener('click', () => {
                    document.querySelectorAll('.friend-select-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    friendElement.classList.add('selected');
                });
                
                modalFriendsList.appendChild(friendElement);
            }
        }
        
    } catch (error) {
        console.error("Erreur chargement amis modal:", error);
    }
}

// Rechercher des amis dans le modal
async function searchFriendsForModal() {
    const searchTerm = document.getElementById('recipientSearch').value.toLowerCase();
    const friendItems = document.querySelectorAll('.friend-select-item');
    
    friendItems.forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Démarrer une nouvelle conversation
function startNewConversation(friendId) {
    hideNewMessageModal();
    
    // Trouver la conversation existante ou en créer une nouvelle
    const existingConversation = conversations.find(conv => 
        conv.friend.uid === friendId
    );
    
    if (existingConversation) {
        openConversation(existingConversation.id, existingConversation.friend);
    } else {
        // Créer une nouvelle conversation
        getUserData(friendId).then(friendData => {
            if (friendData) {
                const conversationId = generateConversationId(currentUser.uid, friendId);
                openConversation(conversationId, friendData);
            }
        });
    }
}

// Rechercher dans les conversations
function searchConversations() {
    const searchTerm = document.getElementById('conversationsSearch').value.toLowerCase();
    const conversationItems = document.querySelectorAll('.conversation-item');
    
    conversationItems.forEach(item => {
        const name = item.querySelector('.conversation-name').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Utilitaires
function generateConversationId(user1, user2) {
    return [user1, user2].sort().join('_');
}

async function getUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
        console.error("Erreur récupération utilisateur:", error);
        return null;
    }
}

function getCurrentUserAvatar() {
    // Cette fonction devrait récupérer l'avatar de l'utilisateur actuel
    // Pour l'instant, on retourne une image par défaut
    return 'assets/default-avatar.png';
}

function formatMessageTime(timestamp, short = false) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (short) {
        // Pour les aperçus : "14:30" ou "hier"
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString()) {
            return 'Hier';
        } else {
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        }
    } else {
        // Pour les messages : "14:30"
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
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