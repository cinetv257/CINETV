// js/settings.js
import { auth, db, storage } from './firebase.js';
import { 
    doc, 
    getDoc, 
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

let currentUser = null;
let userData = null;

// Initialisation
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        setupEventListeners();
        switchSection('profile');
    } else {
        window.location.href = 'login.html';
    }
});

// Charger les données utilisateur
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            updateSettingsUI();
        }
    } catch (error) {
        console.error("Erreur chargement données:", error);
    }
}

// Mettre à jour l'interface des paramètres
function updateSettingsUI() {
    if (!userData) return;
    
    // Section profil
    document.getElementById('settingsDisplayName').value = userData.displayName || '';
    document.getElementById('settingsBio').value = userData.bio || '';
    document.getElementById('settingsAvatar').src = userData.profilePic || 'assets/default-avatar.png';
    document.getElementById('currentEmail').value = currentUser.email || '';
    
    // Section confidentialité
    if (userData.privacy) {
        document.getElementById('publicProfile').checked = userData.privacy.profilePublic !== false;
        document.getElementById('messagesFromNonFriends').checked = userData.privacy.messagesFromNonFriends === true;
        document.getElementById('postVisibility').value = userData.privacy.postVisibility || 'public';
        document.getElementById('showOnlineStatus').checked = userData.privacy.showOnlineStatus !== false;
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Navigation des paramètres
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    // Formulaire profil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Changement d'avatar
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUpload = document.getElementById('avatarUpload');
    
    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
    
    // Formulaire compte
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', handleAccountUpdate);
    }
    
    // Suppression de compte
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleAccountDeletion);
    }
    
    // Paramètres de confidentialité
    const savePrivacySettings = document.getElementById('savePrivacySettings');
    if (savePrivacySettings) {
        savePrivacySettings.addEventListener('click', handlePrivacyUpdate);
    }
}

// Changer de section
function switchSection(sectionName) {
    // Mettre à jour la navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Activer la section sélectionnée
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    const activeSection = document.getElementById(`${sectionName}Section`);
    
    if (activeNav) activeNav.classList.add('active');
    if (activeSection) activeSection.classList.add('active');
    
    // Mettre à jour l'URL
    window.history.replaceState(null, '', `#${sectionName}`);
}

// Gérer la mise à jour du profil
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const displayName = document.getElementById('settingsDisplayName').value.trim();
    const bio = document.getElementById('settingsBio').value.trim();
    
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            displayName: displayName,
            bio: bio,
            updatedAt: new Date()
        });
        
        showSuccessMessage('Profil mis à jour avec succès');
        
        // Recharger les données
        await loadUserData();
        
    } catch (error) {
        console.error("Erreur mise à jour profil:", error);
        showErrorMessage('Erreur lors de la mise à jour du profil');
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
        const avatar = document.getElementById('settingsAvatar');
        const originalSrc = avatar.src;
        avatar.style.opacity = '0.5';
        
        // Upload de l'image
        const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(avatarRef, file);
        const downloadURL = await getDownloadURL(avatarRef);
        
        // Mettre à jour le profil
        await updateDoc(doc(db, 'users', currentUser.uid), {
            profilePic: downloadURL,
            updatedAt: new Date()
        });
        
        // Mettre à jour l'interface
        avatar.src = downloadURL;
        avatar.style.opacity = '1';
        
        showSuccessMessage('Photo de profil mise à jour');
        
    } catch (error) {
        console.error('Erreur upload avatar:', error);
        showErrorMessage('Erreur lors du changement de photo de profil');
        
        // Restaurer l'image originale
        const avatar = document.getElementById('settingsAvatar');
        avatar.style.opacity = '1';
    }
}

// Gérer la mise à jour du compte
async function handleAccountUpdate(e) {
    e.preventDefault();
    
    const newEmail = document.getElementById('newEmail').value.trim();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    try {
        let updates = [];
        
        // Vérifier si l'email est modifié
        if (newEmail && newEmail !== currentUser.email) {
            // Ré-authentifier l'utilisateur
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            
            // Mettre à jour l'email
            await updateEmail(currentUser, newEmail);
            updates.push('email');
        }
        
        // Vérifier si le mot de passe est modifié
        if (newPassword) {
            if (newPassword !== confirmNewPassword) {
                throw new Error('Les mots de passe ne correspondent pas');
            }
            
            if (newPassword.length < 6) {
                throw new Error('Le mot de passe doit contenir au moins 6 caractères');
            }
            
            // Ré-authentifier l'utilisateur
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            
            // Mettre à jour le mot de passe
            await updatePassword(currentUser, newPassword);
            updates.push('mot de passe');
        }
        
        if (updates.length > 0) {
            showSuccessMessage(`${updates.join(' et ')} mis à jour avec succès`);
            
            // Réinitialiser le formulaire
            e.target.reset();
        } else {
            showInfoMessage('Aucune modification détectée');
        }
        
    } catch (error) {
        console.error('Erreur mise à jour compte:', error);
        showErrorMessage(getAccountErrorMessage(error.code));
    }
}

// Gérer la suppression de compte
async function handleAccountDeletion() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
        return;
    }
    
    const password = prompt('Veuillez confirmer votre mot de passe pour supprimer votre compte:');
    if (!password) return;
    
    try {
        // Ré-authentifier l'utilisateur
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Supprimer les données utilisateur
        await deleteUserData();
        
        // Supprimer le compte Firebase Authentication
        await currentUser.delete();
        
        // Rediriger vers la page de connexion
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Erreur suppression compte:', error);
        showErrorMessage(getAccountErrorMessage(error.code));
    }
}

// Supprimer les données utilisateur
async function deleteUserData() {
    try {
        // Supprimer l'avatar du storage
        try {
            const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
            await deleteObject(avatarRef);
        } catch (error) {
            console.log('Aucun avatar à supprimer');
        }
        
        // Supprimer les posts de l'utilisateur
        const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUser.uid));
        const postsSnapshot = await getDocs(postsQuery);
        
        const deletePromises = postsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Supprimer le document utilisateur
        await deleteDoc(doc(db, 'users', currentUser.uid));
        
        // Retirer l'utilisateur des listes d'amis de ses amis
        const allUsersQuery = query(collection(db, 'users'));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        
        const updatePromises = [];
        allUsersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.friends && userData.friends.includes(currentUser.uid)) {
                updatePromises.push(
                    updateDoc(userDoc.ref, {
                        friends: userData.friends.filter(uid => uid !== currentUser.uid)
                    })
                );
            }
        });
        
        await Promise.all(updatePromises);
        
        console.log('Données utilisateur supprimées avec succès');
        
    } catch (error) {
        console.error('Erreur suppression données:', error);
        throw error;
    }
}

// Gérer la mise à jour de la confidentialité