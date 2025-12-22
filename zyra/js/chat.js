import {
    db,
    auth,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    setDoc,
    getDoc,
    addDoc,
    orderBy,
    realtimeDB,
    ref,
    set,
    onValue,
    push
} from './firebase-config.js';
import { getCurrentUser, updateUserStatus } from './auth.js';
import { IMGBB_API_KEY } from './firebase-config.js';

// Variables globales
let currentConversationId = null;
let currentUserId = null;
let otherUserId = null;
let typingTimeout = null;

// Initialiser le chat
export const initChat = async () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUserId = user.uid;
    
    // Obtenir l'ID de conversation depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    currentConversationId = urlParams.get('conversationId');
    otherUserId = urlParams.get('userId');
    
    if (!currentConversationId || !otherUserId) {
        alert("Paramètres de conversation manquants");
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Charger les informations de l'autre utilisateur
    await loadOtherUserInfo(otherUserId);
    
    // Charger les messages
    await loadMessages(currentConversationId);
    
    // Configurer l'écoute en temps réel des messages
    setupMessagesListener(currentConversationId);
    
    // Configurer l'écoute du statut de frappe
    setupTypingListener(currentConversationId, currentUserId, otherUserId);
    
    // Configurer les événements
    setupChatEvents(user.uid);
    
    // Marquer les messages comme lus
    markMessagesAsRead(currentConversationId, currentUserId);
    
    // Mettre à jour le statut
    await updateUserStatus(user.uid, "En ligne");
};

// Charger les informations de l'autre utilisateur
export const loadOtherUserInfo = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const user = userDoc.data();
            
            // Mettre à jour l'interface
            const otherUserName = document.getElementById('other-user-name');
            const otherUserStatus = document.getElementById('other-user-status');
            const otherUserAvatar = document.getElementById('other-user-avatar');
            
            if (otherUserName) otherUserName.textContent = user.name;
            if (otherUserStatus) {
                otherUserStatus.textContent = user.status;
                otherUserStatus.className = `user-status ${user.status === 'En ligne' ? 'online' : 'offline'}`;
            }
            if (otherUserAvatar && user.photoURL) {
                otherUserAvatar.src = user.photoURL;
            }
            
            // Écouter les changements de statut en temps réel
            const userRef = doc(db, "users", userId);
            onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const updatedUser = docSnap.data();
                    if (otherUserStatus) {
                        otherUserStatus.textContent = updatedUser.status;
                        otherUserStatus.className = `user-status ${updatedUser.status === 'En ligne' ? 'online' : 'offline'}`;
                    }
                }
            });
        }
    } catch (error) {
        console.error("Erreur de chargement des informations utilisateur:", error);
    }
};

// Charger les messages
export const loadMessages = async (conversationId) => {
    try {
        const messagesRef = collection(db, "messages");
        const q = query(
            messagesRef, 
            where("conversationId", "==", conversationId),
            orderBy("timestamp", "asc")
        );
        
        const querySnapshot = await getDocs(q);
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            messagesContainer.innerHTML = '<div class="empty-chat">Aucun message. Commencez la conversation!</div>';
            return;
        }
        
        querySnapshot.forEach((docSnap) => {
            const message = docSnap.data();
            message.id = docSnap.id;
            displayMessage(message, currentUserId);
        });
        
        // Faire défiler vers le bas
        scrollToBottom();
        
    } catch (error) {
        console.error("Erreur de chargement des messages:", error);
    }
};

// Configurer l'écoute en temps réel des messages
export const setupMessagesListener = (conversationId) => {
    const messagesRef = collection(db, "messages");
    const q = query(
        messagesRef, 
        where("conversationId", "==", conversationId),
        orderBy("timestamp", "asc")
    );
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const message = change.doc.data();
                message.id = change.doc.id;
                
                // Vérifier si le message n'est pas déjà affiché
                if (!document.querySelector(`[data-message-id="${message.id}"]`)) {
                    displayMessage(message, currentUserId);
                    scrollToBottom();
                    
                    // Marquer comme lu si c'est un message reçu
                    if (message.senderId !== currentUserId) {
                        markMessageAsRead(message.id, currentUserId);
                    }
                }
            }
        });
    });
};

// Afficher un message
export const displayMessage = (message, currentUserId) => {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    const isCurrentUser = message.senderId === currentUserId;
    const messageTime = message.timestamp?.toDate() || new Date();
    const timeString = formatMessageTime(messageTime);
    
    let messageContent = '';
    
    if (message.type === 'image') {
        messageContent = `
            <div class="message-image-container">
                <img src="${message.imageUrl}" alt="Image" class="message-image" onclick="openImageModal('${message.imageUrl}')">
                ${message.content ? `<p class="image-caption">${message.content}</p>` : ''}
            </div>
        `;
    } else {
        messageContent = `<p class="message-text">${message.content}</p>`;
    }
    
    const readStatus = isCurrentUser ? 
        `<span class="read-status ${message.readBy?.includes(otherUserId) ? 'read' : 'unread'}">
            <i class="fas fa-check${message.readBy?.includes(otherUserId) ? '-double' : ''}"></i>
        </span>` : '';
    
    const messageElement = `
        <div class="message ${isCurrentUser ? 'sent' : 'received'}" data-message-id="${message.id}">
            <div class="message-content">
                ${messageContent}
                <div class="message-meta">
                    <span class="message-time">${timeString}</span>
                    ${readStatus}
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.innerHTML += messageElement;
    
    // Supprimer l'état de chat vide s'il existe
    const emptyChat = document.querySelector('.empty-chat');
    if (emptyChat) emptyChat.remove();
};

// Envoyer un message texte
export const sendTextMessage = async (content) => {
    if (!content.trim()) return;
    
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Créer le message
        const messageData = {
            conversationId: currentConversationId,
            senderId: user.uid,
            content: content.trim(),
            type: 'text',
            timestamp: serverTimestamp(),
            readBy: [user.uid]
        };
        
        // Ajouter le message à Firestore
        const messageRef = await addDoc(collection(db, "messages"), messageData);
        
        // Mettre à jour la conversation avec le dernier message
        await updateDoc(doc(db, "conversations", currentConversationId), {
            lastMessage: content.trim(),
            lastMessageTime: serverTimestamp(),
            [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
        });
        
        // Réinitialiser le champ de saisie
        const messageInput = document.getElementById('message-input');
        if (messageInput) messageInput.value = '';
        
        // Envoyer une notification de frappe (arrêt)
        sendTypingStatus(false);
        
    } catch (error) {
        console.error("Erreur d'envoi de message:", error);
        alert("Erreur lors de l'envoi du message: " + error.message);
    }
};

// Envoyer une image via ImgBB
export const sendImageMessage = async (file, caption = '') => {
    if (!file || !file.type.startsWith('image/')) {
        alert("Veuillez sélectionner une image valide");
        return;
    }
    
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Préparer le formulaire pour ImgBB
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', file);
        
        // Afficher un indicateur de chargement
        showLoadingIndicator();
        
        // Upload vers ImgBB
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Créer le message avec l'image
            const messageData = {
                conversationId: currentConversationId,
                senderId: user.uid,
                content: caption.trim(),
                type: 'image',
                imageUrl: result.data.url,
                timestamp: serverTimestamp(),
                readBy: [user.uid]
            };
            
            // Ajouter le message à Firestore
            await addDoc(collection(db, "messages"), messageData);
            
            // Mettre à jour la conversation
            const lastMessageText = caption.trim() ? `📷 ${caption.trim()}` : "📷 Image";
            await updateDoc(doc(db, "conversations", currentConversationId), {
                lastMessage: lastMessageText,
                lastMessageTime: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
            });
            
            // Fermer le modal d'image si ouvert
            closeImageModal();
            
        } else {
            throw new Error(result.error?.message || "Échec de l'upload de l'image");
        }
        
    } catch (error) {
        console.error("Erreur d'envoi d'image:", error);
        alert("Erreur lors de l'envoi de l'image: " + error.message);
    } finally {
        hideLoadingIndicator();
    }
};

// Configurer l'écoute du statut de frappe
export const setupTypingListener = (conversationId, currentUserId, otherUserId) => {
    const typingRef = ref(realtimeDB, `typing/${conversationId}/${otherUserId}`);
    
    onValue(typingRef, (snapshot) => {
        const isTyping = snapshot.val();
        const typingIndicator = document.getElementById('typing-indicator');
        
        if (typingIndicator) {
            if (isTyping) {
                typingIndicator.style.display = 'block';
            } else {
                typingIndicator.style.display = 'none';
            }
        }
    });
};

// Envoyer le statut de frappe
export const sendTypingStatus = (isTyping) => {
    if (!currentConversationId || !otherUserId) return;
    
    const typingRef = ref(realtimeDB, `typing/${currentConversationId}/${currentUserId}`);
    
    if (isTyping) {
        set(typingRef, true);
        
        // Définir un timeout pour arrêter l'indication de frappe après 2 secondes d'inactivité
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            sendTypingStatus(false);
        }, 2000);
    } else {
        set(typingRef, false);
        if (typingTimeout) clearTimeout(typingTimeout);
    }
};

// Marquer les messages comme lus
export const markMessagesAsRead = async (conversationId, userId) => {
    try {
        // Réinitialiser le compteur de messages non lus
        await updateDoc(doc(db, "conversations", conversationId), {
            [`unreadCount.${userId}`]: 0
        });
        
        // Marquer tous les messages non lus comme lus
        const messagesRef = collection(db, "messages");
        const q = query(
            messagesRef,
            where("conversationId", "==", conversationId),
            where("senderId", "==", otherUserId)
        );
        
        const querySnapshot = await getDocs(q);
        const batch = firebase.firestore().batch();
        
        querySnapshot.forEach((docSnap) => {
            const messageRef = doc(db, "messages", docSnap.id);
            const readBy = docSnap.data().readBy || [];
            if (!readBy.includes(userId)) {
                batch.update(messageRef, {
                    readBy: [...readBy, userId]
                });
            }
        });
        
        await batch.commit();
        
    } catch (error) {
        console.error("Erreur de marquage des messages comme lus:", error);
    }
};

// Marquer un message comme lu
export const markMessageAsRead = async (messageId, userId) => {
    try {
        const messageRef = doc(db, "messages", messageId);
        const messageDoc = await getDoc(messageRef);
        
        if (messageDoc.exists()) {
            const message = messageDoc.data();
            const readBy = message.readBy || [];
            
            if (!readBy.includes(userId)) {
                await updateDoc(messageRef, {
                    readBy: [...readBy, userId]
                });
                
                // Mettre à jour le statut de lecture dans l'interface
                const readStatus = document.querySelector(`[data-message-id="${messageId}"] .read-status`);
                if (readStatus) {
                    readStatus.classList.add('read');
                    readStatus.innerHTML = '<i class="fas fa-check-double"></i>';
                }
            }
        }
    } catch (error) {
        console.error("Erreur de marquage du message comme lu:", error);
    }
};

// Configurer les événements du chat
export const setupChatEvents = (userId) => {
    // Envoi de message texte
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            sendTypingStatus(true);
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendTextMessage(messageInput.value);
            }
        });
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (messageInput) {
                sendTextMessage(messageInput.value);
            }
        });
    }
    
    // Envoi d'image
    const imageInput = document.getElementById('image-input');
    const attachBtn = document.getElementById('attach-btn');
    
    if (attachBtn && imageInput) {
        attachBtn.addEventListener('click', () => {
            imageInput.click();
        });
        
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                // Ouvrir le modal pour ajouter une légende
                openImageModalForUpload(file);
            }
        });
    }
    
    // Bouton retour
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
    
    // Menu de l'autre utilisateur
    const otherUserMenu = document.getElementById('other-user-menu');
    if (otherUserMenu) {
        otherUserMenu.addEventListener('click', () => {
            // Implémenter le menu contextuel (profile, blocage, etc.)
            alert("Menu utilisateur - À implémenter");
        });
    }
};

// Fonctions utilitaires
export const formatMessageTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const scrollToBottom = () => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
};

export const showLoadingIndicator = () => {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
};

export const hideLoadingIndicator = () => {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
};

// Fonctions pour le modal d'image
window.openImageModal = (imageUrl) => {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    
    if (modal && modalImg) {
        modalImg.src = imageUrl;
        modal.style.display = 'block';
    }
};

window.closeImageModal = () => {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.openImageModalForUpload = (file) => {
    const uploadModal = document.getElementById('upload-image-modal');
    const previewImg = document.getElementById('image-preview');
    const captionInput = document.getElementById('image-caption');
    const sendImageBtn = document.getElementById('send-image-btn');
    const cancelUploadBtn = document.getElementById('cancel-upload-btn');
    
    if (uploadModal && previewImg) {
        // Afficher la prévisualisation
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Réinitialiser la légende
        if (captionInput) captionInput.value = '';
        
        // Afficher le modal
        uploadModal.style.display = 'block';
        
        // Configurer les événements
        if (sendImageBtn) {
            sendImageBtn.onclick = () => {
                sendImageMessage(file, captionInput?.value || '');
            };
        }
        
        if (cancelUploadBtn) {
            cancelUploadBtn.onclick = () => {
                uploadModal.style.display = 'none';
            };
        }
    }
};

// Fermer les modals en cliquant à l'extérieur
window.onclick = (event) => {
    const imageModal = document.getElementById('image-modal');
    const uploadModal = document.getElementById('upload-image-modal');
    
    if (imageModal && event.target === imageModal) {
        imageModal.style.display = 'none';
    }
    
    if (uploadModal && event.target === uploadModal) {
        uploadModal.style.display = 'none';
    }
};