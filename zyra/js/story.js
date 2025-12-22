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
    deleteDoc
} from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { IMGBB_API_KEY } from './firebase-config.js';

// Variables globales
let currentUserId = null;
let currentStories = [];
let currentStoryIndex = 0;
let storyInterval = null;

// Initialiser les stories
export const initStories = async () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUserId = user.uid;
    
    // Vérifier si on veut créer une story
    const urlParams = new URLSearchParams(window.location.search);
    const createStory = urlParams.get('create') === 'true';
    const viewUserId = urlParams.get('userId');
    
    if (createStory) {
        // Mode création de story
        setupCreateStoryMode();
    } else if (viewUserId) {
        // Mode visualisation de story
        await setupViewStoryMode(viewUserId);
    } else {
        // Mode liste des stories
        await loadAllStories();
    }
    
    // Configurer les événements
    setupStoryEvents();
};

// Mode création de story
export const setupCreateStoryMode = () => {
    const storyViewer = document.getElementById('story-viewer');
    const storyCreator = document.getElementById('story-creator');
    
    if (storyViewer) storyViewer.style.display = 'none';
    if (storyCreator) storyCreator.style.display = 'block';
    
    // Configurer l'upload d'image
    const storyImageInput = document.getElementById('story-image-input');
    const storyImagePreview = document.getElementById('story-image-preview');
    const addStoryBtn = document.getElementById('add-story-btn');
    
    if (addStoryBtn && storyImageInput) {
        addStoryBtn.addEventListener('click', () => {
            storyImageInput.click();
        });
        
        storyImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (storyImagePreview) {
                        storyImagePreview.src = event.target.result;
                        storyImagePreview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Configurer l'envoi
    const publishStoryBtn = document.getElementById('publish-story-btn');
    const storyCaption = document.getElementById('story-caption');
    
    if (publishStoryBtn) {
        publishStoryBtn.addEventListener('click', async () => {
            const file = storyImageInput.files[0];
            const caption = storyCaption?.value || '';
            
            if (!file) {
                alert("Veuillez sélectionner une image");
                return;
            }
            
            await createStory(file, caption);
        });
    }
    
    // Annuler
    const cancelStoryBtn = document.getElementById('cancel-story-btn');
    if (cancelStoryBtn) {
        cancelStoryBtn.addEventListener('click', () => {
            window.location.href = 'story.html';
        });
    }
};

// Mode visualisation de story
export const setupViewStoryMode = async (userId) => {
    const storyCreator = document.getElementById('story-creator');
    const storyViewer = document.getElementById('story-viewer');
    
    if (storyCreator) storyCreator.style.display = 'none';
    if (storyViewer) storyViewer.style.display = 'block';
    
    // Charger les stories de l'utilisateur
    await loadUserStories(userId);
    
    // Afficher la première story
    if (currentStories.length > 0) {
        displayStory(currentStoryIndex);
        startStoryTimer();
        
        // Marquer comme vue
        await markStoryAsViewed(currentStories[currentStoryIndex].id, currentUserId);
    } else {
        // Aucune story disponible
        storyViewer.innerHTML = `
            <div class="no-stories">
                <p>Aucune story disponible</p>
                <button id="close-story-viewer" class="btn">Fermer</button>
            </div>
        `;
    }
};

// Mode liste des stories
export const loadAllStories = async () => {
    try {
        // Obtenir toutes les stories non expirées
        const storiesRef = collection(db, "stories");
        const q = query(
            storiesRef,
            where("expiresAt", ">", new Date()),
            orderBy("expiresAt", "asc")
        );
        
        const querySnapshot = await getDocs(q);
        
        // Grouper par utilisateur
        const storiesByUser = {};
        
        querySnapshot.forEach((docSnap) => {
            const story = docSnap.data();
            story.id = docSnap.id;
            
            if (!storiesByUser[story.userId]) {
                storiesByUser[story.userId] = [];
            }
            storiesByUser[story.userId].push(story);
        });
        
        // Afficher la liste
        const storiesList = document.getElementById('stories-list');
        if (!storiesList) return;
        
        storiesList.innerHTML = '';
        
        // Ajouter l'option pour créer une story
        const user = getCurrentUser();
        const addStoryElement = `
            <div class="story-list-item add-story" id="my-story-item">
                <div class="story-avatar-container">
                    <img src="${user.photoURL}" alt="Votre story" class="story-list-avatar">
                    <div class="add-story-icon">+</div>
                </div>
                <span class="story-list-name">Votre story</span>
            </div>
        `;
        storiesList.innerHTML += addStoryElement;
        
        // Afficher les stories des autres utilisateurs
        for (const [storyUserId, userStories] of Object.entries(storiesByUser)) {
            if (storyUserId === currentUserId) continue;
            
            // Obtenir les infos de l'utilisateur
            const userDoc = await getDoc(doc(db, "users", storyUserId));
            if (!userDoc.exists()) continue;
            
            const storyUser = userDoc.data();
            const latestStory = userStories[userStories.length - 1];
            const hasSeen = latestStory.views && latestStory.views.includes(currentUserId);
            
            const storyElement = `
                <div class="story-list-item ${hasSeen ? 'seen' : 'unseen'}" data-user-id="${storyUserId}">
                    <div class="story-avatar-container">
                        <img src="${storyUser.photoURL}" alt="${storyUser.name}" class="story-list-avatar">
                    </div>
                    <span class="story-list-name">${storyUser.name}</span>
                </div>
            `;
            storiesList.innerHTML += storyElement;
        }
        
        // Ajouter les événements de clic
        document.getElementById('my-story-item')?.addEventListener('click', () => {
            window.location.href = 'story.html?create=true';
        });
        
        document.querySelectorAll('.story-list-item:not(.add-story)').forEach(item => {
            item.addEventListener('click', () => {
                const storyUserId = item.getAttribute('data-user-id');
                window.location.href = `story.html?userId=${storyUserId}`;
            });
        });
        
    } catch (error) {
        console.error("Erreur de chargement des stories:", error);
    }
};

// Charger les stories d'un utilisateur spécifique
export const loadUserStories = async (userId) => {
    try {
        const storiesRef = collection(db, "stories");
        const q = query(
            storiesRef,
            where("userId", "==", userId),
            where("expiresAt", ">", new Date()),
            orderBy("expiresAt", "asc")
        );
        
        const querySnapshot = await getDocs(q);
        currentStories = [];
        
        querySnapshot.forEach((docSnap) => {
            const story = docSnap.data();
            story.id = docSnap.id;
            currentStories.push(story);
        });
        
        // Mettre à jour l'en-tête avec le nom de l'utilisateur
        if (currentStories.length > 0) {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const user = userDoc.data();
                const storyHeader = document.getElementById('story-viewer-header');
                if (storyHeader) {
                    storyHeader.innerHTML = `
                        <img src="${user.photoURL}" alt="${user.name}" class="story-viewer-avatar">
                        <span>${user.name}</span>
                        <span class="story-time">${formatStoryTime(currentStories[0].createdAt?.toDate())}</span>
                    `;
                }
            }
        }
        
    } catch (error) {
        console.error("Erreur de chargement des stories utilisateur:", error);
    }
};

// Créer une nouvelle story
export const createStory = async (file, caption) => {
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
            // Calculer la date d'expiration (24 heures)
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            
            // Créer la story
            const storyData = {
                userId: user.uid,
                imageUrl: result.data.url,
                text: caption.trim(),
                views: [],
                createdAt: serverTimestamp(),
                expiresAt: expiresAt
            };
            
            // Ajouter à Firestore
            await addDoc(collection(db, "stories"), storyData);
            
            // Rediriger vers la liste des stories
            window.location.href = 'story.html';
            
        } else {
            throw new Error(result.error?.message || "Échec de l'upload de l'image");
        }
        
    } catch (error) {
        console.error("Erreur de création de story:", error);
        alert("Erreur lors de la création de la story: " + error.message);
    } finally {
        hideLoadingIndicator();
    }
};

// Afficher une story
export const displayStory = (index) => {
    if (index < 0 || index >= currentStories.length) return;
    
    const story = currentStories[index];
    const storyViewer = document.getElementById('story-viewer-content');
    
    if (!storyViewer) return;
    
    // Mettre à jour l'indicateur de progression
    updateProgressBar(index);
    
    // Afficher la story
    storyViewer.innerHTML = `
        <div class="story-content">
            <img src="${story.imageUrl}" alt="Story" class="story-image">
            ${story.text ? `<div class="story-text">${story.text}</div>` : ''}
            <div class="story-views">
                <i class="fas fa-eye"></i>
                <span>${story.views?.length || 0} vues</span>
            </div>
        </div>
    `;
    
    // Mettre à jour l'en-tête
    updateStoryHeader(index);
    
    currentStoryIndex = index;
};

// Mettre à jour la barre de progression
export const updateProgressBar = (currentIndex) => {
    const progressContainer = document.getElementById('story-progress');
    if (!progressContainer) return;
    
    progressContainer.innerHTML = '';
    
    for (let i = 0; i < currentStories.length; i++) {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        if (i === currentIndex) {
            progressBar.classList.add('active');
        } else if (i < currentIndex) {
            progressBar.classList.add('completed');
        }
        
        progressContainer.appendChild(progressBar);
    }
};

// Mettre à jour l'en-tête de la story
export const updateStoryHeader = async (index) => {
    const story = currentStories[index];
    const storyHeader = document.getElementById('story-viewer-header');
    
    if (storyHeader && story) {
        const userDoc = await getDoc(doc(db, "users", story.userId));
        if (userDoc.exists()) {
            const user = userDoc.data();
            storyHeader.innerHTML = `
                <img src="${user.photoURL}" alt="${user.name}" class="story-viewer-avatar">
                <span>${user.name}</span>
                <span class="story-time">${formatStoryTime(story.createdAt?.toDate())}</span>
            `;
        }
    }
};

// Démarrer le timer de la story
export const startStoryTimer = () => {
    if (storyInterval) clearInterval(storyInterval);
    
    storyInterval = setInterval(() => {
        if (currentStoryIndex < currentStories.length - 1) {
            // Passer à la story suivante
            displayStory(currentStoryIndex + 1);
            
            // Marquer comme vue
            markStoryAsViewed(currentStories[currentStoryIndex].id, currentUserId);
        } else {
            // Retourner à la liste
            clearInterval(storyInterval);
            window.location.href = 'story.html';
        }
    }, 5000); // 5 secondes par story
};

// Marquer une story comme vue
export const markStoryAsViewed = async (storyId, userId) => {
    try {
        const storyRef = doc(db, "stories", storyId);
        const storyDoc = await getDoc(storyRef);
        
        if (storyDoc.exists()) {
            const story = storyDoc.data();
            const views = story.views || [];
            
            if (!views.includes(userId)) {
                await updateDoc(storyRef, {
                    views: [...views, userId]
                });
            }
        }
    } catch (error) {
        console.error("Erreur de marquage de la story comme vue:", error);
    }
};

// Configurer les événements des stories
export const setupStoryEvents = () => {
    // Navigation dans le visualiseur de stories
    const prevBtn = document.getElementById('prev-story-btn');
    const nextBtn = document.getElementById('next-story-btn');
    const closeBtn = document.getElementById('close-story-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStoryIndex > 0) {
                displayStory(currentStoryIndex - 1);
                if (storyInterval) {
                    clearInterval(storyInterval);
                    startStoryTimer();
                }
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStoryIndex < currentStories.length - 1) {
                displayStory(currentStoryIndex + 1);
                if (storyInterval) {
                    clearInterval(storyInterval);
                    startStoryTimer();
                }
            } else {
                window.location.href = 'story.html';
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.location.href = 'story.html';
        });
    }
    
    // Navigation générale
    const navChat = document.getElementById('nav-chat');
    const navStories = document.getElementById('nav-stories');
    const navProfile = document.getElementById('nav-profile');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (navChat) {
        navChat.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
    
    if (navStories) {
        navStories.addEventListener('click', () => {
            window.location.href = 'story.html';
        });
    }
    
    if (navProfile) {
        navProfile.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { logoutUser } = await import('./auth.js');
            await logoutUser();
            window.location.href = 'index.html';
        });
    }
};

// Formater le temps de la story
export const formatStoryTime = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "À l'instant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    return date.toLocaleDateString();
};

// Indicateur de chargement
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