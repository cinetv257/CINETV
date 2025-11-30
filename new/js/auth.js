// js/auth.js
import { auth, db } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    signOut 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Gestion de l'inscription
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const displayName = document.getElementById('displayName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        const messageDiv = document.getElementById('authMessage');
        
        // Validation
        if (password !== confirmPassword) {
            showMessage(messageDiv, "Les mots de passe ne correspondent pas", "error");
            return;
        }
        
        if (password.length < 6) {
            showMessage(messageDiv, "Le mot de passe doit contenir au moins 6 caractères", "error");
            return;
        }
        
        try {
            // Création de l'utilisateur
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Mise à jour du profil
            await updateProfile(user, {
                displayName: displayName
            });
            
            // Création du document utilisateur dans Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                displayName: displayName,
                email: email,
                createdAt: new Date(),
                weeklyPoints: 0,
                totalPoints: 0,
                profilePic: null,
                bio: "",
                friends: [],
                friendRequests: [],
                sentRequests: [],
                privacy: {
                    profilePublic: true,
                    messagesFromNonFriends: false,
                    postVisibility: 'public',
                    showOnlineStatus: true
                }
            });
            
            showMessage(messageDiv, "Compte créé avec succès! Redirection...", "success");
            
            // Redirection vers la page d'accueil après 2 secondes
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 2000);
            
        } catch (error) {
            console.error("Erreur d'inscription:", error);
            showMessage(messageDiv, getErrorMessage(error.code), "error");
        }
    });
}

// Gestion de la connexion
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const messageDiv = document.getElementById('authMessage');
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage(messageDiv, "Connexion réussie! Redirection...", "success");
            
            // Redirection vers la page d'accueil après 1 seconde
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
            
        } catch (error) {
            console.error("Erreur de connexion:", error);
            showMessage(messageDiv, getErrorMessage(error.code), "error");
        }
    });
}

// Déconnexion
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
        }
    });
}

// Affichage des messages
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove('hidden');
    
    // Masquer le message après 5 secondes
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

// Traduction des codes d'erreur Firebase
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé par un autre compte.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/weak-password': 'Le mot de passe est trop faible.',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer plus tard.'
    };
    
    return errorMessages[errorCode] || 'Une erreur est survenue. Veuillez réessayer.';
}

// Vérification de l'état d'authentification
auth.onAuthStateChanged((user) => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user && (currentPage === 'login.html' || currentPage === 'signup.html')) {
        // Utilisateur connecté sur les pages d'authentification -> redirection
        window.location.href = 'home.html';
    } else if (!user && currentPage !== 'login.html' && currentPage !== 'signup.html' && currentPage !== 'index.html') {
        // Utilisateur non connecté sur une page protégée -> redirection
        window.location.href = 'login.html';
    }
});