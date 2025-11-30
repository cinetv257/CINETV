// js/upload.js
import { auth, db, storage } from './firebase.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { addPoints, POINTS } from './progression.js';

// Variables globales
let currentUser = null;
let selectedImage = null;
let selectedVideo = null;

// Initialisation
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        setupEventListeners();
    } else {
        window.location.href = 'login.html';
    }
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Upload d'image
    const imageUpload = document.getElementById('imageUpload');
    const imageInput = document.getElementById('imageInput');
    
    if (imageUpload && imageInput) {
        imageUpload.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageSelect);
    }
    
    // Upload de vidéo
    const videoUpload = document.getElementById('videoUpload');
    const videoInput = document.getElementById('videoInput');
    
    if (videoUpload && videoInput) {
        videoUpload.addEventListener('click', () => videoInput.click());
        videoInput.addEventListener('change', handleVideoSelect);
    }
    
    // Formulaire de publication
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handlePostSubmit);
    }
    
    // Retour
    const backButton = document.querySelector('.btn-secondary[onclick]');
    if (backButton) {
        backButton.onclick = () => window.history.back();
    }
}

// Gérer la sélection d'image
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner une image valide');
            return;
        }
        
        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('L\'image ne doit pas dépasser 5MB');
            return;
        }
        
        selectedImage = file;
        selectedVideo = null; // Désélectionner la vidéo
        
        // Afficher l'aperçu
        displayPreview(file, 'image');
    }
}

// Gérer la sélection de vidéo
function handleVideoSelect(e) {
    const file = e.target.files[0];
    if (file) {
        // Vérifier le type de fichier
        if (!file.type.startsWith('video/')) {
            alert('Veuillez sélectionner une vidéo valide');
            return;
        }
        
        // Vérifier la taille (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('La vidéo ne doit pas dépasser 50MB');
            return;
        }
        
        selectedVideo = file;
        selectedImage = null; // Désélectionner l'image
        
        // Afficher l'aperçu
        displayPreview(file, 'video');
    }
}

// Afficher l'aperçu du média
function displayPreview(file, type) {
    const previewArea = document.getElementById('previewArea');
    if (!previewArea) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        previewArea.innerHTML = '';
        
        if (type === 'image') {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-image';
            img.alt = 'Aperçu de l\'image';
            previewArea.appendChild(img);
        } else if (type === 'video') {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.controls = true;
            video.className = 'preview-image';
            previewArea.appendChild(video);
        }
        
        // Ajouter un bouton pour supprimer l'aperçu
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-danger btn-sm';
        removeBtn.innerHTML = '<i class="fas fa-times"></i> Supprimer';
        removeBtn.onclick = clearPreview;
        previewArea.appendChild(removeBtn);
    };
    
    reader.readAsDataURL(file);
}

// Effacer l'aperçu
function clearPreview() {
    const previewArea = document.getElementById('previewArea');
    if (previewArea) {
        previewArea.innerHTML = '';
    }
    
    selectedImage = null;
    selectedVideo = null;
    
    // Réinitialiser les inputs de fichier
    const imageInput = document.getElementById('imageInput');
    const videoInput = document.getElementById('videoInput');
    if (imageInput) imageInput.value = '';
    if (videoInput) videoInput.value = '';
}

// Gérer la soumission du post
async function handlePostSubmit(e) {
    e.preventDefault();
    
    const content = document.getElementById('postContent').value.trim();
    const visibility = document.getElementById('postVisibility').value;
    
    // Validation
    if (!content && !selectedImage && !selectedVideo) {
        alert('Veuillez ajouter du contenu, une image ou une vidéo');
        return;
    }
    
    try {
        // Afficher un indicateur de chargement
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
        submitButton.disabled = true;
        
        // Upload et création du post
        await createPost(content, visibility);
        
        // Réinitialiser le formulaire
        clearPreview();
        document.getElementById('postContent').value = '';
        
        // Afficher un message de succès
        showSuccessMessage('Publication créée avec succès !');
        
        // Rediriger vers la page d'accueil après un délai
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Erreur lors de la publication:', error);
        alert('Erreur lors de la publication. Veuillez réessayer.');
    } finally {
        // Restaurer le bouton
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        submitButton.disabled = false;
    }
}

// Créer un post avec upload de média
async function createPost(content, visibility) {
    let imageUrl = null;
    let videoUrl = null;
    
    try {
        // Upload de l'image si présente
        if (selectedImage) {
            const imageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${selectedImage.name}`);
            await uploadBytes(imageRef, selectedImage);
            imageUrl = await getDownloadURL(imageRef);
        }
        
        // Upload de la vidéo si présente
        if (selectedVideo) {
            const videoRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${selectedVideo.name}`);
            await uploadBytes(videoRef, selectedVideo);
            videoUrl = await getDownloadURL(videoRef);
        }
        
        // Données du post
        const postData = {
            userId: currentUser.uid,
            content: content,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            likes: [],
            comments: [],
            visibility: visibility,
            createdAt: serverTimestamp()
        };
        
        // Ajouter le post à Firestore
        await addDoc(collection(db, 'posts'), postData);
        
        // Ajouter des points pour la publication
        await addPoints(POINTS.POST, 'post_creation');
        
        console.log('Post créé avec succès');
        
    } catch (error) {
        console.error('Erreur création post:', error);
        throw error;
    }
}

// Afficher un message de succès
function showSuccessMessage(message) {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Styles pour la notification
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 15px 20px;
        border-radius: var(--radius);
        box-shadow: var(--shadow-hover);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Ajouter des styles d'animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .success-notification {
        animation: slideInRight 0.3s ease;
    }
`;
document.head.appendChild(style);