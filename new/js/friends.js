// js/friends.js
import { auth, db } from './firebase.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { addPoints, POINTS } from './progression.js';

let currentUser = null;
let currentTab = 'all';

// Initialisation
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadFriendsData();
        setupEventListeners();
        switchTab('all');
    } else {
        window.location.href = 'login.html';
    }
});

// Charger les données d'amis
async function loadFriendsData() {
    await updateFriendsCount();
    await loadFriendRequests();
    await loadSuggestions();
}

// Mettre à jour les compteurs d'amis
async function updateFriendsCount() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Mettre à jour les compteurs
            document.getElementById('allFriendsCount').textContent = userData.friends ? userData.friends.length : 0;
            document.getElementById('requestsCount').textContent = userData.friendRequests ? userData.friendRequests.length : 0;
            
            // Statistiques
            document.getElementById('totalFriends').textContent = userData.friends ? userData.friends.length : 0;
            document.getElementById('pendingRequests').textContent = userData.friendRequests ? userData.friendRequests.length : 0;
            
            // Compter les amis dans le TOP 10 (simulation)
            document.getElementById('topFriends').textContent = '0';
        }
    } catch (error) {
        console.error("Erreur mise à jour compteurs:", error);
    }
}

// Charger les demandes d'amis
async function loadFriendRequests() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        const receivedRequests = document.getElementById('receivedRequests');
        const sentRequests = document.getElementById('sentRequests');
        
        if (!receivedRequests || !sentRequests) return;
        
        // Demandes reçues
        receivedRequests.innerHTML = '';
        if (userData.friendRequests && userData.friendRequests.length > 0) {
            for (const requestId of userData.friendRequests) {
                const requestUser = await getUserData(requestId);
                if (requestUser) {
                    const requestElement = createRequestElement(requestUser, 'received');
                    receivedRequests.appendChild(requestElement);
                }
            }
        } else {
            receivedRequests.innerHTML = '<p class="no-requests">Aucune demande reçue</p>';
        }
        
        // Demandes envoyées
        sentRequests.innerHTML = '';
        if (userData.sentRequests && userData.sentRequests.length > 0) {
            for (const requestId of userData.sentRequests) {
                const requestUser = await getUserData(requestId);
                if (requestUser) {
                    const requestElement = createRequestElement(requestUser, 'sent');
                    sentRequests.appendChild(requestElement);
                }
            }
        } else {
            sentRequests.innerHTML = '<p class="no-requests">Aucune demande envoyée</p>';
        }
        
    } catch (error) {
        console.error("Erreur chargement demandes:", error);
    }
}

// Créer un élément de demande d'ami
function createRequestElement(user, type) {
    const element = document.createElement('div');
    element.className = 'request-item';
    element.innerHTML = `
        <img src="${user.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="request-avatar">
        <div class="request-info">
            <div class="request-name">${user.displayName}</div>
            <div class="request-meta">${user.bio || 'Membre Zyra'}</div>
        </div>
        <div class="request-actions">
            ${type === 'received' ? `
                <button class="btn-primary btn-sm accept-request" data-uid="${user.uid}">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-secondary btn-sm decline-request" data-uid="${user.uid}">
                    <i class="fas fa-times"></i>
                </button>
            ` : `
                <button class="btn-secondary btn-sm cancel-request" data-uid="${user.uid}">
                    Annuler
                </button>
            `}
        </div>
    `;
    
    return element;
}

// Charger les suggestions d'amis
async function loadSuggestions() {
    try {
        // Récupérer tous les utilisateurs sauf l'utilisateur actuel et ses amis
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        const friends = userData.friends || [];
        const sentRequests = userData.sentRequests || [];
        const friendRequests = userData.friendRequests || [];
        
        const excludedUsers = [currentUser.uid, ...friends, ...sentRequests, ...friendRequests];
        
        const usersQuery = query(collection(db, 'users'), limit(20));
        const snapshot = await getDocs(usersQuery);
        
        const suggestionsGrid = document.getElementById('suggestionsGrid');
        if (!suggestionsGrid) return;
        
        suggestionsGrid.innerHTML = '';
        
        let suggestionsCount = 0;
        
        snapshot.forEach(doc => {
            const user = doc.data();
            if (!excludedUsers.includes(user.uid) && suggestionsCount < 6) {
                const suggestionElement = createSuggestionElement(user);
                suggestionsGrid.appendChild(suggestionElement);
                suggestionsCount++;
            }
        });
        
        document.getElementById('suggestionsCount').textContent = suggestionsCount;
        
        if (suggestionsCount === 0) {
            suggestionsGrid.innerHTML = '<p class="no-suggestions">Aucune suggestion pour le moment</p>';
        }
        
    } catch (error) {
        console.error("Erreur chargement suggestions:", error);
    }
}

// Créer un élément de suggestion
function createSuggestionElement(user) {
    const element = document.createElement('div');
    element.className = 'friend-card';
    element.innerHTML = `
        <img src="${user.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="friend-card-avatar">
        <h4 class="friend-card-name">${user.displayName}</h4>
        <p class="friend-card-points">
            <i class="fas fa-star"></i> ${user.weeklyPoints || 0} points
        </p>
        <p class="friend-card-bio">${user.bio || 'Nouveau sur Zyra'}</p>
        <div class="friend-actions">
            <button class="btn-primary btn-sm add-friend-btn" data-uid="${user.uid}">
                <i class="fas fa-user-plus"></i> Ajouter
            </button>
            <button class="btn-secondary btn-sm view-profile-btn" data-uid="${user.uid}">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `;
    
    return element;
}

// Charger tous les amis
async function loadAllFriends() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        const friendsGrid = document.getElementById('friendsGrid');
        if (!friendsGrid) return;
        
        friendsGrid.innerHTML = '';
        
        if (!userData.friends || userData.friends.length === 0) {
            friendsGrid.innerHTML = `
                <div class="no-friends">
                    <i class="fas fa-users fa-3x"></i>
                    <h3>Vous n'avez pas encore d'amis</h3>
                    <p>Ajoutez des amis pour commencer à interagir</p>
                    <button class="btn-primary" onclick="switchTab('suggestions')">
                        <i class="fas fa-user-plus"></i> Trouver des amis
                    </button>
                </div>
            `;
            return;
        }
        
        // Charger les données de chaque ami
        for (const friendId of userData.friends) {
            const friendData = await getUserData(friendId);
            if (friendData) {
                const friendElement = createFriendElement(friendData);
                friendsGrid.appendChild(friendElement);
            }
        }
        
    } catch (error) {
        console.error("Erreur chargement amis:", error);
    }
}

// Créer un élément ami
function createFriendElement(user) {
    const element = document.createElement('div');
    element.className = 'friend-card';
    element.innerHTML = `
        <img src="${user.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="friend-card-avatar">
        <h4 class="friend-card-name">${user.displayName}</h4>
        <p class="friend-card-points">
            <i class="fas fa-star"></i> ${user.weeklyPoints || 0} points cette semaine
        </p>
        <p class="friend-card-bio">${user.bio || 'Membre Zyra'}</p>
        <div class="friend-actions">
            <button class="btn-primary btn-sm message-friend-btn" data-uid="${user.uid}">
                <i class="fas fa-comment"></i> Message
            </button>
            <button class="btn-secondary btn-sm view-profile-btn" data-uid="${user.uid}">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-danger btn-sm remove-friend-btn" data-uid="${user.uid}">
                <i class="fas fa-user-minus"></i>
            </button>
        </div>
    `;
    
    return element;
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Onglets
    const tabButtons = document.querySelectorAll('.friends-tab');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Recherche d'amis
    const friendsSearch = document.getElementById('friendsSearch');
    if (friendsSearch) {
        friendsSearch.addEventListener('input', debounce(searchFriends, 300));
    }
    
    // Recherche d'utilisateurs
    const usersSearch = document.getElementById('usersSearch');
    if (usersSearch) {
        usersSearch.addEventListener('input', debounce(searchUsers, 300));
    }
    
    // Actions globales (délégation d'événements)
    document.addEventListener('click', async (e) => {
        // Accepter une demande
        if (e.target.closest('.accept-request')) {
            const button = e.target.closest('.accept-request');
            const friendUid = button.dataset.uid;
            await acceptFriendRequest(friendUid);
        }
        
        // Refuser une demande
        else if (e.target.closest('.decline-request')) {
            const button = e.target.closest('.decline-request');
            const friendUid = button.dataset.uid;
            await declineFriendRequest(friendUid);
        }
        
        // Annuler une demande envoyée
        else if (e.target.closest('.cancel-request')) {
            const button = e.target.closest('.cancel-request');
            const friendUid = button.dataset.uid;
            await cancelFriendRequest(friendUid);
        }
        
        // Ajouter un ami depuis les suggestions
        else if (e.target.closest('.add-friend-btn')) {
            const button = e.target.closest('.add-friend-btn');
            const friendUid = button.dataset.uid;
            await sendFriendRequest(friendUid);
        }
        
        // Voir le profil
        else if (e.target.closest('.view-profile-btn')) {
            const button = e.target.closest('.view-profile-btn');
            const friendUid = button.dataset.uid;
            window.location.href = `profile.html?id=${friendUid}`;
        }
        
        // Envoyer un message
        else if (e.target.closest('.message-friend-btn')) {
            const button = e.target.closest('.message-friend-btn');
            const friendUid = button.dataset.uid;
            window.location.href = `messages.html`;
        }
        
        // Supprimer un ami
        else if (e.target.closest('.remove-friend-btn')) {
            const button = e.target.closest('.remove-friend-btn');
            const friendUid = button.dataset.uid;
            await removeFriend(friendUid);
        }
    });
}

// Changer d'onglet
async function switchTab(tabName) {
    currentTab = tabName;
    
    // Mettre à jour les boutons d'onglets
    document.querySelectorAll('.friends-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePane = document.getElementById(`${tabName}Tab`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePane) activePane.classList.add('active');
    
    // Charger le contenu de l'onglet
    switch (tabName) {
        case 'all':
            await loadAllFriends();
            break;
        case 'requests':
            await loadFriendRequests();
            break;
        case 'suggestions':
            await loadSuggestions();
            break;
        case 'search':
            // Le contenu est chargé via la recherche
            break;
    }
}

// Envoyer une demande d'ami
async function sendFriendRequest(friendUid) {
    try {
        await updateDoc(doc(db, 'users', friendUid), {
            friendRequests: arrayUnion(currentUser.uid)
        });
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
            sentRequests: arrayUnion(friendUid)
        });
        
        // Recharger les données
        await loadFriendsData();
        
        // Si on est dans l'onglet suggestions, recharger
        if (currentTab === 'suggestions') {
            await loadSuggestions();
        }
        
        console.log("Demande d'ami envoyée");
        
    } catch (error) {
        console.error("Erreur envoi demande d'ami:", error);
        alert("Erreur lors de l'envoi de la demande d'ami");
    }
}

// Accepter une demande d'ami
async function acceptFriendRequest(friendUid) {
    try {
        // Ajouter aux amis de l'utilisateur actuel
        await updateDoc(doc(db, 'users', currentUser.uid), {
            friends: arrayUnion(friendUid),
            friendRequests: arrayRemove(friendUid)
        });
        
        // Ajouter aux amis de l'autre utilisateur
        await updateDoc(doc(db, 'users', friendUid), {
            friends: arrayUnion(currentUser.uid),
            sentRequests: arrayRemove(currentUser.uid)
        });
        
        // Ajouter des points pour l'ajout d'ami
        await addPoints(POINTS.FRIEND_ADD, 'friend_add');
        
        // Recharger les données
        await loadFriendsData();
        await loadFriendRequests();
        
        console.log("Demande d'ami acceptée");
        
    } catch (error) {
        console.error("Erreur acceptation demande d'ami:", error);
        alert("Erreur lors de l'acceptation de la demande d'ami");
    }
}

// Refuser une demande d'ami
async function declineFriendRequest(friendUid) {
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            friendRequests: arrayRemove(friendUid)
        });
        
        await updateDoc(doc(db, 'users', friendUid), {
            sentRequests: arrayRemove(currentUser.uid)
        });
        
        // Recharger les données
        await loadFriendRequests();
        
        console.log("Demande d'ami refusée");
        
    } catch (error) {
        console.error("Erreur refus demande d'ami:", error);
        alert("Erreur lors du refus de la demande d'ami");
    }
}

// Annuler une demande d'ami envoyée
async function cancelFriendRequest(friendUid) {
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            sentRequests: arrayRemove(friendUid)
        });
        
        await updateDoc(doc(db, 'users', friendUid), {
            friendRequests: arrayRemove(currentUser.uid)
        });
        
        // Recharger les données
        await loadFriendRequests();
        
        console.log("Demande d'ami annulée");
        
    } catch (error) {
        console.error("Erreur annulation demande d'ami:", error);
        alert("Erreur lors de l'annulation de la demande d'ami");
    }
}

// Supprimer un ami
async function removeFriend(friendUid) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet ami ?")) {
        return;
    }
    
    try {
        // Retirer des amis de l'utilisateur actuel
        await updateDoc(doc(db, 'users', currentUser.uid), {
            friends: arrayRemove(friendUid)
        });
        
        // Retirer des amis de l'autre utilisateur
        await updateDoc(doc(db, 'users', friendUid), {
            friends: arrayRemove(currentUser.uid)
        });
        
        // Recharger les données
        await loadAllFriends();
        
        console.log("Ami supprimé");
        
    } catch (error) {
        console.error("Erreur suppression ami:", error);
        alert("Erreur lors de la suppression de l'ami");
    }
}

// Rechercher parmi les amis
async function searchFriends(query) {
    // Implémentation basique - dans une vraie app, on ferait une requête Firestore
    const friendsGrid = document.getElementById('friendsGrid');
    if (!friendsGrid) return;
    
    const friendCards = friendsGrid.querySelectorAll('.friend-card');
    
    friendCards.forEach(card => {
        const name = card.querySelector('.friend-card-name').textContent.toLowerCase();
        if (name.includes(query.toLowerCase())) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Rechercher des utilisateurs
async function searchUsers(query) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults || !query.trim()) return;
    
    try {
        // Recherche basique - dans une vraie app, on utiliserait un index de recherche
        const usersQuery = query(
            collection(db, 'users'),
            where('displayName', '>=', query),
            where('displayName', '<=', query + '\uf8ff'),
            limit(10)
        );
        
        const snapshot = await getDocs(usersQuery);
        searchResults.innerHTML = '';
        
        if (snapshot.empty) {
            searchResults.innerHTML = '<p class="no-results">Aucun utilisateur trouvé</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const user = doc.data();
            if (user.uid !== currentUser.uid) {
                const userElement = createUserSearchResult(user);
                searchResults.appendChild(userElement);
            }
        });
        
    } catch (error) {
        console.error("Erreur recherche utilisateurs:", error);
        searchResults.innerHTML = '<p class="error">Erreur lors de la recherche</p>';
    }
}

// Créer un résultat de recherche
function createUserSearchResult(user) {
    const element = document.createElement('div');
    element.className = 'friend-card';
    element.innerHTML = `
        <img src="${user.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="friend-card-avatar">
        <h4 class="friend-card-name">${user.displayName}</h4>
        <p class="friend-card-points">
            <i class="fas fa-star"></i> ${user.weeklyPoints || 0} points
        </p>
        <p class="friend-card-bio">${user.bio || 'Membre Zyra'}</p>
        <div class="friend-actions">
            <button class="btn-primary btn-sm add-friend-btn" data-uid="${user.uid}">
                <i class="fas fa-user-plus"></i> Ajouter
            </button>
            <button class="btn-secondary btn-sm view-profile-btn" data-uid="${user.uid}">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `;
    
    return element;
}

// Obtenir les données d'un utilisateur
async function getUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
        console.error("Erreur récupération utilisateur:", error);
        return null;
    }
}

// Utilitaires
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}