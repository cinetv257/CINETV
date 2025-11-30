// js/profile.js
import { auth, db, storage } from './firebase.js';
import { 
    doc, 
    getDoc, 
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getUserWeeklyPoints, getUserRank } from './progression.js';

let currentUser = null;
let profileUser = null; // Peut être différent si on visite le profil d'un autre utilisateur

// Initialisation
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Vérifier si on visite son propre profil ou celui d'un autre utilisateur
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        
        if (userId && userId !== user.uid) {
            // Profil d'un autre utilisateur
            profileUser = userId;
            await loadUserProfile(userId);
        } else {
            // Profil de l'utilisateur connecté
            profileUser = user.uid;
            await loadUserProfile(user.uid);
            setupEventListeners();
        }
        
        await loadUserPosts(profileUser);
        await loadFriendsPreview(profileUser);
    } else {
        window.location.href = 'login.html';
    }
});

// Charger le profil utilisateur
async function loadUserProfile(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Mettre à jour l'interface
            updateProfileUI(userData);
            
            // Charger les statistiques
            await loadUserStats(userId, userData);
        } else {
            console.error("Utilisateur non trouvé");
        }
    } catch (error) {
        console.error("Erreur chargement profil:", error);
    }
}

// Mettre à jour l'interface du profil
function updateProfileUI(userData) {
    // En-tête du profil
    document.getElementById('profileDisplayName').textContent = userData.displayName;
    document.getElementById('profileBio').textContent = userData.bio || 'Aucune bio';
    document.getElementById('profileAvatar').src = userData.profilePic || 'assets/default-avatar.png';
    
    // Informations membres
    document.getElementById('memberSince').textContent = userData.createdAt ? 
        new Date(userData.createdAt.toDate()).toLocaleDateString() : 'Récemment';
    
    // Points hebdomadaires
    document.getElementById('weeklyPointsDisplay').textContent = userData.weeklyPoints || 0;
    document.getElementById('weeklyPoints').textContent = userData.weeklyPoints || 0;
    
    // Vérifier si c'est le profil de l'utilisateur connecté
    const isOwnProfile = currentUser.uid === profileUser;
    const editProfileBtn = document.getElementById('editProfileBtn');
    
    if (editProfileBtn) {
        if (isOwnProfile) {
            editProfileBtn.style.display = 'block';
        } else {
            editProfileBtn.style.display = 'none';
        }
    }
}

// Charger les statistiques utilisateur
async function loadUserStats(userId, userData) {
    try {
        // Compter les posts
        const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
        const postsSnapshot = await getDocs(postsQuery);
        document.getElementById('postsCount').textContent = postsSnapshot.size;
        
        // Compter les amis
        document.getElementById('friendsCount').textContent = userData.friends ? userData.friends.length : 0;
        
        // Obtenir le classement
        const userRank = await getUserRank(userId);
        document.getElementById('userRank').textContent = userRank ? `#${userRank}` : 'Non classé';
        
    } catch (error) {
        console.error("Erreur chargement statistiques:", error);
    }
}

// Charger les posts de l'utilisateur
async function loadUserPosts(userId) {
    try {
        const postsQuery = query(
            collection(db, 'posts'), 
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        
        const snapshot = await getDocs(postsQuery);
        const postsContainer = document.getElementById('userPosts');
        
        if (postsContainer) {
            postsContainer.innerHTML = '';
            
            if (snapshot.empty) {
                postsContainer.innerHTML = `
                    <div class="no-posts">
                        <i class="fas fa-camera fa-3x"></i>
                        <h3>Aucune publication</h3>
                        <p>${currentUser.uid === userId ? 'Commencez à partager vos moments !' : 'Cet utilisateur n\'a pas encore publié'}</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(async (docSnapshot) => {
                const post = docSnapshot.data();
                const postElement = await createPostElement(post);
                postsContainer.appendChild(postElement);
            });
        }
    } catch (error) {
        console.error("Erreur chargement posts utilisateur:", error);
    }
}

// Créer un élément post pour le profil
async function createPostElement(post) {
    const userDoc = await getDoc(doc(db, 'users', post.userId));
    const userData = userDoc.exists() ? userDoc.data() : { displayName: 'Utilisateur inconnu' };
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.innerHTML = `
        <div class="post-content">
            <p>${post.content || ''}</p>
            ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
            ${post.videoUrl ? `<video src="${post.videoUrl}" controls class="post-image"></video>` : ''}
        </div>
        <div class="post-meta">
            <span class="post-time">${formatTime(post.createdAt?.toDate())}</span>
            <div class="post-stats">
                <span><i class="fas fa-heart"></i> ${post.likes?.length || 0}</span>
                <span><i class="fas fa-comment"></i> ${post.comments?.length || 0}</span>
            </div>
        </div>
    `;
    
    return postElement;
}

// Charger l'aperçu des amis
async function loadFriendsPreview(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        
        const friendsPreview = document.getElementById('friendsPreview');
        if (!friendsPreview) return;
        
        friendsPreview.innerHTML = '';
        
        if (!userData.friends || userData.friends.length === 0) {
            friendsPreview.innerHTML = '<p class="no-friends">Aucun ami</p>';
            return;
        }
        
        // Prendre les 6 premiers amis
        const friendIds = userData.friends.slice(0, 6);
        
        for (const friendId of friendIds) {
            const friendDoc = await getDoc(doc(db, 'users', friendId));
            if (friendDoc.exists()) {
                const friendData = friendDoc.data();
                const friendElement = document.createElement('div');
                friendElement.className = 'friend-preview';
                friendElement.innerHTML = `
                    <img src="${friendData.profilePic || 'assets/default-avatar.png'}" 
                         alt="${friendData.displayName}" 
                         class="friend-avatar">
                    <div class="friend-name">${friendData.displayName}</div>
                `;
                friendElement.onclick = () => {
                    window.location.href = `profile.html?id=${friendId}`;
                };
                friendsPreview.appendChild(friendElement);
            }
        }
    } catch (error) {
        console.error("Erreur chargement amis:", error);
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Bouton modifier le profil
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            window.location.href = 'settings.html#profile';
        });
    }
    
    // Édition de l'avatar
    const avatarEdit = document.querySelector('.avatar-edit');
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/*';
    avatarInput.style.display = 'none';
    
    if (avatarEdit) {
        avatarEdit.addEventListener('click', () => {
            avatarInput.click();
        });
    }
    
    avatarInput.addEventListener('change', handleAvatarUpload);
    document.body.appendChild(avatarInput);
    
    // Onglets du profil
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Changer d'onglet
function switchTab(tabName) {
    // Désactiver tous les onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    const activePane = document.getElementById(`${tabName}Tab`);
    
    if (activeButton) activeButton.classList.add('active');
    if (activePane) activePane.classList.add('active');
    
    // Charger le contenu spécifique à l'onglet si nécessaire
    if (tabName === 'photos') {
        loadUserPhotos();
    } else if (tabName === 'videos') {
        loadUserVideos();
    }
}

// Gérer l'upload de l'avatar
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Vérifications
    if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 2MB');
        return;
    }
    
    try {
        // Afficher un indicateur de chargement
        const avatar = document.getElementById('profileAvatar');
        const originalSrc = avatar.src;
        avatar.src = 'assets/loading.gif';
        
        // Upload de l'image
        const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(avatarRef, file);
        const downloadURL = await getDownloadURL(avatarRef);
        
        // Mettre à jour le profil dans Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            profilePic: downloadURL
        });
        
        // Mettre à jour l'interface
        avatar.src = downloadURL;
        
        // Mettre à jour aussi l'avatar dans la navigation si nécessaire
        const navAvatar = document.querySelector('.user-avatar-small');
        if (navAvatar) {
            navAvatar.src = downloadURL;
        }
        
        console.log('Avatar mis à jour avec succès');
        
    } catch (error) {
        console.error('Erreur upload avatar:', error);
        alert('Erreur lors du changement d\'avatar');
        
        // Restaurer l'image originale
        const avatar = document.getElementById('profileAvatar');
        avatar.src = originalSrc;
    }
}

// Charger les photos de l'utilisateur
async function loadUserPhotos() {
    const photosGrid = document.getElementById('photosGrid');
    if (!photosGrid) return;
    
    try {
        const postsQuery = query(
            collection(db, 'posts'), 
            where('userId', '==', profileUser),
            where('imageUrl', '!=', null),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        
        const snapshot = await getDocs(postsQuery);
        photosGrid.innerHTML = '';
        
        if (snapshot.empty) {
            photosGrid.innerHTML = '<p class="no-media">Aucune photo</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const post = doc.data();
            if (post.imageUrl) {
                const photoElement = document.createElement('div');
                photoElement.className = 'media-item';
                photoElement.innerHTML = `<img src="${post.imageUrl}" alt="Photo">`;
                photosGrid.appendChild(photoElement);
            }
        });
    } catch (error) {
        console.error("Erreur chargement photos:", error);
    }
}

// Charger les vidéos de l'utilisateur
async function loadUserVideos() {
    const videosGrid = document.getElementById('videosGrid');
    if (!videosGrid) return;
    
    try {
        const postsQuery = query(
            collection(db, 'posts'), 
            where('userId', '==', profileUser),
            where('videoUrl', '!=', null),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        
        const snapshot = await getDocs(postsQuery);
        videosGrid.innerHTML = '';
        
        if (snapshot.empty) {
            videosGrid.innerHTML = '<p class="no-media">Aucune vidéo</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const post = doc.data();
            if (post.videoUrl) {
                const videoElement = document.createElement('div');
                videoElement.className = 'media-item';
                videoElement.innerHTML = `
                    <video src="${post.videoUrl}" muted>
                        Votre navigateur ne supporte pas la lecture de vidéos.
                    </video>
                    <div class="video-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                `;
                
                videoElement.addEventListener('click', () => {
                    const video = videoElement.querySelector('video');
                    if (video.paused) {
                        video.play();
                        videoElement.querySelector('.video-overlay').style.display = 'none';
                    } else {
                        video.pause();
                        videoElement.querySelector('.video-overlay').style.display = 'flex';
                    }
                });
                
                videosGrid.appendChild(videoElement);
            }
        });
    } catch (error) {
        console.error("Erreur chargement vidéos:", error);
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