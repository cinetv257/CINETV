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
    realtimeDB,
    ref,
    set,
    onValue
} from './firebase-config.js';
import { getCurrentUser, updateUserStatus } from './auth.js';

// Initialiser le dashboard
export const initDashboard = async () => {
    const user = getCurrentUser();
    if (!user) return;

    // Mettre à jour le statut
    await updateUserStatus(user.uid, "En ligne");
    
    // Charger les conversations
    await loadConversations(user.uid);
    
    // Charger les utilisateurs
    await loadUsers(user.uid);
    
    // Charger les stories
    await loadStories(user.uid);
    
    // Écouter les nouvelles conversations en temps réel
    setupConversationsListener(user.uid);
    
    // Configurer les événements
    setupDashboardEvents(user);
};

// Charger les conversations
export const loadConversations = async (userId) => {
    try {
        const conversationsRef = collection(db, "conversations");
        const q = query(conversationsRef, where("participants", "array-contains", userId));
        const querySnapshot = await getDocs(q);
        
        const conversationsList = document.getElementById('conversations-list');
        if (!conversationsList) return;
        
        conversationsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            conversationsList.innerHTML = '<div class="empty-state">Aucune conversation</div>';
            return;
        }
        
        const conversations = [];
        
        for (const docSnap of querySnapshot.docs) {
            const conversation = docSnap.data();
            conversation.id = docSnap.id;
            
            // Obtenir les informations de l'autre participant
            const otherUserId = conversation.participants.find(id => id !== userId);
            if (otherUserId) {
                const userDoc = await getDoc(doc(db, "users", otherUserId));
                if (userDoc.exists()) {
                    conversation.otherUser = userDoc.data();
                    conversations.push(conversation);
                }
            }
        }
        
        // Trier par dernier message
        conversations.sort((a, b) => {
            const timeA = a.lastMessageTime?.toDate() || new Date(0);
            const timeB = b.lastMessageTime?.toDate() || new Date(0);
            return timeB - timeA;
        });
        
        // Afficher les conversations
        conversations.forEach(conv => {
            const lastMessageTime = conv.lastMessageTime?.toDate() || new Date();
            const timeString = formatTime(lastMessageTime);
            
            const conversationElement = `
                <div class="conversation-item" data-conversation-id="${conv.id}" data-user-id="${conv.otherUser.uid}">
                    <img src="${conv.otherUser.photoURL}" alt="${conv.otherUser.name}" class="conversation-avatar">
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <span class="conversation-name">${conv.otherUser.name}</span>
                            <span class="conversation-time">${timeString}</span>
                        </div>
                        <div class="conversation-preview">
                            <span class="conversation-last-message">${conv.lastMessage || 'Aucun message'}</span>
                            ${conv.unreadCount && conv.unreadCount[userId] > 0 ? 
                                `<span class="unread-badge">${conv.unreadCount[userId]}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
            conversationsList.innerHTML += conversationElement;
        });
        
        // Ajouter les événements de clic
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.getAttribute('data-conversation-id');
                const userId = item.getAttribute('data-user-id');
                window.location.href = `chat.html?conversationId=${conversationId}&userId=${userId}`;
            });
        });
        
    } catch (error) {
        console.error("Erreur de chargement des conversations:", error);
    }
};

// Charger les utilisateurs pour créer de nouvelles conversations
export const loadUsers = async (currentUserId) => {
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        usersList.innerHTML = '';
        
        querySnapshot.forEach((docSnap) => {
            const user = docSnap.data();
            
            // Ne pas afficher l'utilisateur courant
            if (user.uid === currentUserId) return;
            
            const userElement = `
                <div class="user-item" data-user-id="${user.uid}">
                    <img src="${user.photoURL}" alt="${user.name}" class="user-avatar">
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-status ${user.status === 'En ligne' ? 'online' : 'offline'}">${user.status}</span>
                    </div>
                    <button class="start-chat-btn" data-user-id="${user.uid}">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            `;
            usersList.innerHTML += userElement;
        });
        
        // Ajouter les événements pour démarrer une conversation
        document.querySelectorAll('.start-chat-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const targetUserId = btn.getAttribute('data-user-id');
                await startNewConversation(currentUserId, targetUserId);
            });
        });
        
    } catch (error) {
        console.error("Erreur de chargement des utilisateurs:", error);
    }
};

// Démarrer une nouvelle conversation
export const startNewConversation = async (currentUserId, targetUserId) => {
    try {
        // Vérifier si une conversation existe déjà
        const conversationsRef = collection(db, "conversations");
        const q = query(
            conversationsRef, 
            where("participants", "array-contains", currentUserId)
        );
        
        const querySnapshot = await getDocs(q);
        let existingConversation = null;
        
        for (const docSnap of querySnapshot.docs) {
            const conversation = docSnap.data();
            if (conversation.participants.includes(targetUserId)) {
                existingConversation = { id: docSnap.id, ...conversation };
                break;
            }
        }
        
        if (existingConversation) {
            // Rediriger vers la conversation existante
            window.location.href = `chat.html?conversationId=${existingConversation.id}&userId=${targetUserId}`;
        } else {
            // Créer une nouvelle conversation
            const newConversationRef = doc(collection(db, "conversations"));
            await setDoc(newConversationRef, {
                participants: [currentUserId, targetUserId],
                lastMessage: "",
                lastMessageTime: serverTimestamp(),
                unreadCount: {
                    [currentUserId]: 0,
                    [targetUserId]: 0
                },
                createdAt: serverTimestamp()
            });
            
            // Rediriger vers la nouvelle conversation
            window.location.href = `chat.html?conversationId=${newConversationRef.id}&userId=${targetUserId}`;
        }
        
    } catch (error) {
        console.error("Erreur de création de conversation:", error);
        alert("Erreur lors de la création de la conversation: " + error.message);
    }
};

// Charger les stories
export const loadStories = async (userId) => {
    try {
        const storiesRef = collection(db, "stories");
        const q = query(storiesRef, where("expiresAt", ">", new Date()));
        const querySnapshot = await getDocs(q);
        
        const storiesContainer = document.getElementById('stories-container');
        if (!storiesContainer) return;
        
        storiesContainer.innerHTML = '';
        
        // Grouper les stories par utilisateur
        const storiesByUser = {};
        
        querySnapshot.forEach((docSnap) => {
            const story = docSnap.data();
            story.id = docSnap.id;
            
            if (!storiesByUser[story.userId]) {
                storiesByUser[story.userId] = [];
            }
            storiesByUser[story.userId].push(story);
        });
        
        // Afficher les stories
        for (const [storyUserId, userStories] of Object.entries(storiesByUser)) {
            if (storyUserId === userId) continue; // Ne pas afficher ses propres stories
            
            // Obtenir les infos de l'utilisateur
            const userDoc = await getDoc(doc(db, "users", storyUserId));
            if (!userDoc.exists()) continue;
            
            const user = userDoc.data();
            const latestStory = userStories[userStories.length - 1];
            const hasSeen = latestStory.views && latestStory.views.includes(userId);
            
            const storyElement = `
                <div class="story-item ${hasSeen ? 'seen' : 'unseen'}" data-user-id="${storyUserId}">
                    <div class="story-avatar-container">
                        <img src="${user.photoURL}" alt="${user.name}" class="story-avatar">
                    </div>
                    <span class="story-name">${user.name}</span>
                </div>
            `;
            storiesContainer.innerHTML += storyElement;
        }
        
        // Ajouter l'option pour créer une story
        const addStoryElement = `
            <div class="story-item add-story" id="add-story-btn">
                <div class="story-avatar-container">
                    <i class="fas fa-plus"></i>
                </div>
                <span class="story-name">Ajouter</span>
            </div>
        `;
        storiesContainer.innerHTML = addStoryElement + storiesContainer.innerHTML;
        
        // Ajouter les événements
        document.querySelectorAll('.story-item:not(.add-story)').forEach(item => {
            item.addEventListener('click', () => {
                const storyUserId = item.getAttribute('data-user-id');
                window.location.href = `story.html?userId=${storyUserId}`;
            });
        });
        
        document.getElementById('add-story-btn')?.addEventListener('click', () => {
            window.location.href = 'story.html?create=true';
        });
        
    } catch (error) {
        console.error("Erreur de chargement des stories:", error);
    }
};

// Écouter les nouvelles conversations en temps réel
export const setupConversationsListener = (userId) => {
    const conversationsRef = collection(db, "conversations");
    const q = query(conversationsRef, where("participants", "array-contains", userId));
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                // Mettre à jour l'interface pour cette conversation
                const conversation = change.doc.data();
                updateConversationUI(conversation, userId);
            }
        });
    });
};

// Mettre à jour l'interface d'une conversation
export const updateConversationUI = (conversation, userId) => {
    const conversationElement = document.querySelector(`[data-conversation-id="${conversation.id}"]`);
    if (conversationElement) {
        // Mettre à jour le dernier message et le badge non lu
        const lastMessageEl = conversationElement.querySelector('.conversation-last-message');
        const unreadBadge = conversationElement.querySelector('.unread-badge');
        const timeEl = conversationElement.querySelector('.conversation-time');
        
        if (lastMessageEl) lastMessageEl.textContent = conversation.lastMessage || 'Aucun message';
        if (timeEl && conversation.lastMessageTime) {
            timeEl.textContent = formatTime(conversation.lastMessageTime.toDate());
        }
        
        // Mettre à jour le badge non lu
        const unreadCount = conversation.unreadCount?.[userId] || 0;
        if (unreadBadge) {
            if (unreadCount > 0) {
                unreadBadge.textContent = unreadCount;
                unreadBadge.style.display = 'flex';
            } else {
                unreadBadge.style.display = 'none';
            }
        }
    }
};

// Configurer les événements du dashboard
export const setupDashboardEvents = (user) => {
    // Recherche d'utilisateurs
    const searchInput = document.getElementById('search-users');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const userItems = document.querySelectorAll('.user-item');
            
            userItems.forEach(item => {
                const userName = item.querySelector('.user-name').textContent.toLowerCase();
                if (userName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Déconnexion
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { logoutUser } = await import('./auth.js');
            await logoutUser();
            window.location.href = 'index.html';
        });
    }
    
    // Navigation
    document.getElementById('nav-chat')?.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
    
    document.getElementById('nav-stories')?.addEventListener('click', () => {
        window.location.href = 'story.html';
    });
    
    document.getElementById('nav-profile')?.addEventListener('click', () => {
        window.location.href = 'profile.html';
    });
    
    // Mettre à jour le nom de l'utilisateur dans le header
    const userNameHeader = document.getElementById('user-name-header');
    if (userNameHeader) {
        userNameHeader.textContent = user.displayName || user.email;
    }
    
    // Mettre à jour la photo de profil
    const userAvatar = document.getElementById('user-avatar-header');
    if (userAvatar && user.photoURL) {
        userAvatar.src = user.photoURL;
    }
};

// Formater l'heure
export const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return date.toLocaleDateString();
};