import {
    db,
    auth,
    doc,
    updateDoc,
    getDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs
} from './firebase-config.js';
import { getCurrentUser, logoutUser } from './auth.js';
import { IMGBB_API_KEY } from './firebase-config.js';

// Initialiser le profil
export const initProfile = async () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    // Charger les informations du profil
    await loadProfileInfo(user.uid);
    
    // Configurer les événements
    setupProfileEvents(user);
};

// Charger les informations du profil
export const loadProfileInfo = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Mettre à jour l'interface
            document.getElementById('profile-name').textContent = userData.name;
            document.getElementById('profile-email').textContent = userData.email;
            document.getElementById('profile-status').value = userData.status || "Disponible";
            
            const profileImage = document.getElementById('profile-image-preview');
            if (profileImage && userData.photoURL) {
                profileImage.src = userData.photoURL;
            }
            
            // Mettre à jour le dernier accès
            if (userData.lastSeen) {
                const lastSeenDate = userData.lastSeen.toDate();
                document.getElementById('last-seen').textContent = 
                    `Dernier accès: ${formatDate(lastSeenDate)}`;
            }
        }
    } catch (error) {
        console.error("Erreur de chargement du profil:", error);
    }
};

// Mettre à jour le profil
export const updateProfile = async (userId, updates) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, updates);
        
        // Mettre à jour également le profil Firebase Auth si nécessaire
        if (updates.name) {
            await auth.currentUser.updateProfile({
                displayName: updates.name
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error("Erreur de mise à jour du profil:", error);
        return { success: false, error: error.message };
    }
};

// Mettre à jour la photo de profil
export const updateProfilePicture = async (userId, file) => {
    try {
        if (!file || !file.type.startsWith('image/')) {
            return { success: false, error: "Veuillez sélectionner une image valide" };
        }
        
        // Upload vers ImgBB
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', file);
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mettre à jour dans Firestore
            await updateDoc(doc(db, "users", userId), {
                photoURL: result.data.url
            });
            
            // Mettre à jour dans Firebase Auth
            await auth.currentUser.updateProfile({
                photoURL: result.data.url
            });
            
            return { success: true, photoURL: result.data.url };
        } else {
            return { success: false, error: result.error?.message || "Échec de l'upload" };
        }
    } catch (error) {
        console.error("Erreur de mise à jour de la photo:", error);
        return { success: false, error: error.message };
    }
};

// Configurer les événements du profil
export const setupProfileEvents = (user) => {
    // Mettre à jour le statut
    const statusInput = document.getElementById('profile-status');
    const saveStatusBtn = document.getElementById('save-status-btn');
    
    if (saveStatusBtn && statusInput) {
        saveStatusBtn.addEventListener('click', async () => {
            const status = statusInput.value.trim();
            if (status) {
                const result = await updateProfile(user.uid, { status: status });
                if (result.success) {
                    alert("Statut mis à jour avec succès");
                } else {
                    alert("Erreur: " + result.error);
                }
            }
        });
    }
    
    // Changer la photo de profil
    const profileImageInput = document.getElementById('profile-image-input');
    const changePhotoBtn = document.getElementById('change-photo-btn');
    
    if (changePhotoBtn && profileImageInput) {
        changePhotoBtn.addEventListener('click', () => {
            profileImageInput.click();
        });
        
        profileImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const result = await updateProfilePicture(user.uid, file);
                if (result.success) {
                    // Mettre à jour la prévisualisation
                    const profileImage = document.getElementById('profile-image-preview');
                    if (profileImage) {
                        profileImage.src = result.photoURL;
                    }
                    alert("Photo de profil mise à jour avec succès");
                } else {
                    alert("Erreur: " + result.error);
                }
            }
        });
    }
    
    // Déconnexion
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
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
    
    // Suppression de compte
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (confirm("Êtes-vous sûr de vouloir supprimer votre compte? Cette action est irréversible.")) {
                await deleteUserAccount(user.uid);
            }
        });
    }
};

// Supprimer le compte utilisateur
export const deleteUserAccount = async (userId) => {
    try {
        // Supprimer toutes les conversations de l'utilisateur
        const conversationsRef = collection(db, "conversations");
        const q = query(conversationsRef, where("participants", "array-contains", userId));
        const conversationsSnapshot = await getDocs(q);
        
        const batch = firebase.firestore().batch();
        
        conversationsSnapshot.forEach((docSnap) => {
            const conversation = docSnap.data();
            
            // Si la conversation n'a que 2 participants, la supprimer
            if (conversation.participants.length === 2) {
                batch.delete(doc(db, "conversations", docSnap.id));
                
                // Supprimer tous les messages de cette conversation
                // (à faire dans une sous-collection ou via une Cloud Function)
            }
        });
        
        await batch.commit();
        
        // Supprimer toutes les stories de l'utilisateur
        const storiesRef = collection(db, "stories");
        const storiesQuery = query(storiesRef, where("userId", "==", userId));
        const storiesSnapshot = await getDocs(storiesQuery);
        
        const storiesBatch = firebase.firestore().batch();
        storiesSnapshot.forEach((docSnap) => {
            storiesBatch.delete(doc(db, "stories", docSnap.id));
        });
        
        await storiesBatch.commit();
        
        // Supprimer le document utilisateur
        await deleteDoc(doc(db, "users", userId));
        
        // Supprimer le compte Firebase Auth
        await auth.currentUser.delete();
        
        // Rediriger vers la page de login
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error("Erreur de suppression du compte:", error);
        alert("Erreur lors de la suppression du compte: " + error.message);
    }
};

// Formater la date
export const formatDate = (date) => {
    return date.toLocaleDateString() + ' à ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};