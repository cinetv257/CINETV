// js/home.js
import { auth, db, storage } from './firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { addPoints, POINTS } from './progression.js';

// Initialisation
let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        await loadPosts();
        await loadSuggestions();
        await loadLeaderboardPreview();
        await loadNotifications();
        setupEventListeners();
    }
});

// Charger les données utilisateur
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Mettre à jour l'interface
            document.getElementById('userDisplayName').textContent = userData.displayName;
            document.getElementById('userPoints').textContent = userData.weeklyPoints || 0;
            document.getElementById('currentUserAvatar').src = userData.profilePic || 'assets/default-avatar.png';
            document.getElementById('userAvatar').src = userData.profilePic || 'assets/default-avatar.png';
        }
    } catch (error) {
        console.error("Erreur chargement données utilisateur:", error);
    }
}

// Charger les posts
async function loadPosts() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;

    try {
        const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
        
        onSnapshot(postsQuery, (snapshot) => {
            postsContainer.innerHTML = '';
            
            if (snapshot.empty) {
                postsContainer.innerHTML = `
                    <div class="no-posts">
                        <i class="fas fa-newspaper fa-3x"></i>
                        <h3>Aucune publication</h3>
                        <p>Soyez le premier à publier quelque chose !</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(async (docSnapshot) => {
                const post = docSnapshot.data();
                const postElement = await createPostElement(post, docSnapshot.id);
                postsContainer.appendChild(postElement);
            });
        });
    } catch (error) {
        console.error("Erreur chargement posts:", error);
        postsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erreur lors du chargement des publications</p>
            </div>
        `;
    }
}

// Créer un élément post
async function createPostElement(post, postId) {
    const userDoc = await getDoc(doc(db, 'users', post.userId));
    const userData = userDoc.exists() ? userDoc.data() : { displayName: 'Utilisateur inconnu', profilePic: null };
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card fade-in';
    postElement.innerHTML = `
        <div class="post-header">
            <img src="${userData.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="user-avatar-small">
            <div class="post-user-info">
                <h4>${userData.displayName}</h4>
                <span class="post-time">${formatTime(post.createdAt?.toDate())}</span>
            </div>
        </div>
        
        <div class="post-content">
            <p>${post.content || ''}</p>
            ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
            ${post.videoUrl ? `<video src="${post.videoUrl}" controls class="post-image"></video>` : ''}
        </div>
        
        <div class="post-actions-bar">
            <div class="post-action ${post.likes?.includes(currentUser.uid) ? 'liked' : ''}" data-action="like" data-post-id="${postId}">
                <i class="fas fa-heart"></i>
                <span>${post.likes?.length || 0}</span>
            </div>
            <div class="post-action" data-action="comment" data-post-id="${postId}">
                <i class="fas fa-comment"></i>
                <span>${post.comments?.length || 0}</span>
            </div>
            <div class="post-action" data-action="share" data-post-id="${postId}">
                <i class="fas fa-share"></i>
                <span>Partager</span>
            </div>
        </div>
        
        <div class="post-comments hidden" id="comments-${postId}">
            <!-- Commentaires chargés dynamiquement -->
        </div>
    `;
    
    return postElement;
}

// Charger les suggestions d'amis
async function loadSuggestions() {
    const suggestionsList = document.getElementById('suggestionsList');
    if (!suggestionsList) return;

    try {
        const usersQuery = query(collection(db, 'users'), limit(5));
        const snapshot = await getDocs(usersQuery);
        
        suggestionsList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.uid !== currentUser.uid) {
                const suggestionElement = document.createElement('div');
                suggestionElement.className = 'suggestion-item';
                suggestionElement.innerHTML = `
                    <img src="${user.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="user-avatar-small">
                    <div class="suggestion-info">
                        <h5>${user.displayName}</h5>
                        <p>${user.bio || 'Nouveau sur Zyra'}</p>
                    </div>
                    <button class="btn-primary btn-sm add-friend-btn" data-uid="${user.uid}">
                        <i class="fas fa-user-plus"></i>
                    </button>
                `;
                suggestionsList.appendChild(suggestionElement);
            }
        });
    } catch (error) {
        console.error("Erreur chargement suggestions:", error);
    }
}

// Charger l'aperçu du classement
async function loadLeaderboardPreview() {
    const previewContainer = document.getElementById('leaderboardPreview');
    if (!previewContainer) return;

    try {
        const currentWeek = getCurrentWeek();
        const leaderboardQuery = query(
            collection(db, 'leaderboard', currentWeek.toString()), 
            orderBy('weeklyPoints', 'desc'), 
            limit(5)
        );
        
        const snapshot = await getDocs(leaderboardQuery);
        
        previewContainer.innerHTML = '';
        
        snapshot.forEach((doc, index) => {
            const user = doc.data();
            const rankElement = document.createElement('div');
            rankElement.className = 'leaderboard-preview-item';
            rankElement.innerHTML = `
                <div class="rank">${index + 1}</div>
                <img src="${user.profilePic || 'assets/default-avatar.png'}" alt="Avatar" class="user-avatar-small">
                <div class="user-info">
                    <h5>${user.displayName}</h5>
                    <p>${user.weeklyPoints} points</p>
                </div>
            `;
            previewContainer.appendChild(rankElement);
        });
    } catch (error) {
        console.error("Erreur chargement classement:", error);
    }
}

// Charger les notifications
async function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    // Pour l'instant, affichons des notifications simulées
    notificationsList.innerHTML = `
        <div class="notification-item">
            <i class="fas fa-user-plus text-success"></i>
            <div class="notification-content">
                <p>Nouvelle demande d'ami</p>
                <span>Il y a 2 min</span>
            </div>
        </div>
        <div class="notification-item">
            <i class="fas fa-heart text-danger"></i>
            <div class="notification-content">
                <p>3 personnes ont aimé votre publication</p>
                <span>Il y a 1h</span>
            </div>
        </div>
    `;
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Publication de post
    const postTextInput = document.querySelector('.post-text-input');
    const postButton = document.querySelector('.btn-post');
    
    if (postButton && postTextInput) {
        postButton.addEventListener('click', async () => {
            const content = postTextInput.value.trim();
            if (content) {
                await createPost(content);
                postTextInput.value = '';
            }
        });
        
        postTextInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const content = postTextInput.value.trim();
                if (content) {
                    await createPost(content);
                    postTextInput.value = '';
                }
            }
        });
    }
    
    // Actions sur les posts (likes, commentaires)
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('.post-action');
        if (target) {
            const action = target.dataset.action;
            const postId = target.dataset.postId;
            
            switch (action) {
                case 'like':
                    await toggleLike(postId);
                    break;
                case 'comment':
                    toggleComments(postId);
                    break;
                case 'share':
                    sharePost(postId);
                    break;
            }
        }
        
        // Ajout d'amis depuis les suggestions
        if (e.target.closest('.add-friend-btn')) {
            const button = e.target.closest('.add-friend-btn');
            const friendUid = button.dataset.uid;
            await sendFriendRequest(friendUid);
        }
    });
}

// Créer un post
async function createPost(content, imageFile = null, videoFile = null) {
    try {
        let imageUrl = null;
        let videoUrl = null;
        
        // Upload image si présente
        if (imageFile) {
            const imageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(imageRef);
        }
        
        // Upload video si présente
        if (videoFile) {
            const videoRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${videoFile.name}`);
            await uploadBytes(videoRef, videoFile);
            videoUrl = await getDownloadURL(videoRef);
        }
        
        const postData = {
            userId: currentUser.uid,
            content: content,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            likes: [],
            comments: [],
            createdAt: serverTimestamp(),
            visibility: 'public'
        };
        
        await addDoc(collection(db, 'posts'), postData);
        
        // Ajouter des points pour la publication
        await addPoints(POINTS.POST, 'post_creation');
        
        console.log("Post créé avec succès");
    } catch (error) {
        console.error("Erreur création post:", error);
    }
}

// Gérer les likes
async function toggleLike(postId) {
    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        if (postDoc.exists()) {
            const post = postDoc.data();
            const likes = post.likes || [];
            
            if (likes.includes(currentUser.uid)) {
                // Retirer le like
                await updateDoc(postRef, {
                    likes: arrayRemove(currentUser.uid)
                });
            } else {
                // Ajouter le like
                await updateDoc(postRef, {
                    likes: arrayUnion(currentUser.uid)
                });
                
                // Ajouter des points pour le like
                await addPoints(POINTS.LIKE, 'post_like');
            }
        }
    } catch (error) {
        console.error("Erreur like:", error);
    }
}

// Basculer l'affichage des commentaires
function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection) {
        commentsSection.classList.toggle('hidden');
        
        if (!commentsSection.classList.contains('hidden') && commentsSection.children.length === 0) {
            loadComments(postId, commentsSection);
        }
    }
}

// Charger les commentaires
async function loadComments(postId, container) {
    try {
        const postDoc = await getDoc(doc(db, 'posts', postId));
        const post = postDoc.data();
        
        container.innerHTML = '<p>Chargement des commentaires...</p>';
        
        // Simuler le chargement des commentaires
        setTimeout(() => {
            container.innerHTML = `
                <div class="comment-input">
                    <input type="text" placeholder="Ajouter un commentaire..." class="comment-text">
                    <button class="btn-primary btn-sm post-comment-btn" data-post-id="${postId}">Publier</button>
                </div>
                <div class="comments-list">
                    ${post.comments && post.comments.length > 0 ? 
                        post.comments.map(comment => `
                            <div class="comment">
                                <strong>${comment.userName}:</strong> ${comment.text}
                            </div>
                        `).join('') : 
                        '<p>Aucun commentaire</p>'
                    }
                </div>
            `;
        }, 500);
    } catch (error) {
        console.error("Erreur chargement commentaires:", error);
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
        
        console.log("Demande d'ami envoyée");
    } catch (error) {
        console.error("Erreur envoi demande d'ami:", error);
    }
}

// Partager un post
function sharePost(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'Voir cette publication sur Zyra',
            url: `${window.location.origin}/post.html?id=${postId}`
        });
    } else {
        // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
        navigator.clipboard.writeText(`${window.location.origin}/post.html?id=${postId}`);
        alert('Lien copié dans le presse-papier !');
    }
}

// Utilitaires
function formatTime(timestamp) {
    if (!timestamp) return 'Récemment';
    
    const now = new Date();
    const postTime = new Date(timestamp);
    const diff = now - postTime;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days < 7) return `Il y a ${days} j`;
    
    return postTime.toLocaleDateString();
}

function getCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}