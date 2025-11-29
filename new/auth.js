/**
 * * Fichier : auth.js
 * Rôle : Gérer la logique d'authentification (Connexion, Inscription)
 * Page concernée : login.html
 * */

// Importation des références Firebase (authentification et base de données utilisateur)
import { auth, userDB } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Références DOM
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageDisplay = document.getElementById('auth-message');
    const formTitle = document.getElementById('form-title');
    
    // Champs de connexion
    const emailLogin = document.getElementById('emailLogin');
    const passwordLogin = document.getElementById('passwordLogin');
    
    // Champs d'inscription
    const emailRegister = document.getElementById('emailRegister');
    const passwordRegister = document.getElementById('passwordRegister');
    const passwordConfirmRegister = document.getElementById('passwordConfirmRegister');
    
    // Liens de basculement
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');

    // =========================================================================
    // 1. GESTION DE L'AFFICHAGE ET DES MESSAGES
    // =========================================================================

    /**
     * Affiche un message d'état à l'utilisateur.
     * @param {string} text - Le message à afficher.
     * @param {string} type - 'error' ou 'success'.
     */
    function showMessage(text, type) {
        messageDisplay.textContent = text;
        messageDisplay.className = `auth-message ${type}`;
        messageDisplay.classList.remove('hidden');
    }

    /**
     * Bascule l'affichage entre les formulaires de connexion et d'inscription.
     */
    function toggleForms(isRegister) {
        if (isRegister) {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            switchToRegister.classList.add('hidden');
            switchToLogin.classList.remove('hidden');
            formTitle.innerHTML = '<i class="fas fa-user-plus"></i> Inscription';
        } else {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            switchToLogin.classList.add('hidden');
            switchToRegister.classList.remove('hidden');
            formTitle.innerHTML = '<i class="fas fa-sign-in-alt"></i> Connexion';
        }
        messageDisplay.classList.add('hidden'); // Cache le message lors du changement
    }

    // Événements de basculement
    switchToRegister.addEventListener('click', () => toggleForms(true));
    switchToLogin.addEventListener('click', () => toggleForms(false));

    // =========================================================================
    // 2. LOGIQUE D'INSCRIPTION (Création de compte)
    // =========================================================================

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailRegister.value;
        const password = passwordRegister.value;
        const confirmPassword = passwordConfirmRegister.value;

        if (password !== confirmPassword) {
            showMessage("Les mots de passe ne correspondent pas.", 'error');
            return;
        }

        if (password.length < 6) {
            showMessage("Le mot de passe doit contenir au moins 6 caractères.", 'error');
            return;
        }
        
        try {
            // Créer l'utilisateur avec Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Créer le nœud utilisateur initial dans la base de données privée
            await initializeUserProfile(user);

            showMessage("Inscription réussie ! Redirection...", 'success');
            // Redirection vers la page d'accueil
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);

        } catch (error) {
            console.error("Erreur d'inscription:", error.message);
            // Traduction simplifiée des codes d'erreur communs
            let errorMessage = "Erreur lors de l'inscription.";
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "Cet email est déjà utilisé.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Format d'email invalide.";
                    break;
                default:
                    errorMessage = "Erreur inconnue. Veuillez réessayer.";
            }
            showMessage(errorMessage, 'error');
        }
    });

    /**
     * Crée le nœud utilisateur de base dans Firebase Realtime Database.
     * @param {object} user - L'objet utilisateur Firebase.
     */
    async function initializeUserProfile(user) {
        const username = user.email.split('@')[0]; // Utilise la partie avant l'@ comme nom par défaut
        
        const initialUserData = {
            email: user.email,
            username: username,
            createdAt: Date.now(),
            // Nœuds pour les collections utilisateur demandées (Point 3)
            favorites: {}, // Clés: contentId: timestamp
            myList: {},    // Clés: contentId: timestamp
            downloads: {}  // Clés: contentId: timestamp (pour le suivi)
        };
        
        // Écrire les données dans la base de données utilisateur (/users/{uid})
        return userDB.ref('users/' + user.uid).set(initialUserData);
    }

    // =========================================================================
    // 3. LOGIQUE DE CONNEXION
    // =========================================================================

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailLogin.value;
        const password = passwordLogin.value;

        try {
            // Connexion avec Firebase Authentication
            await auth.signInWithEmailAndPassword(email, password);
            
            showMessage("Connexion réussie ! Redirection...", 'success');
            // Redirection vers la page d'accueil
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);

        } catch (error) {
            console.error("Erreur de connexion:", error.message);
            
            let errorMessage = "Erreur lors de la connexion.";
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = "Email ou mot de passe incorrect.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Format d'email invalide.";
                    break;
                default:
                    errorMessage = "Vérifiez vos identifiants et réessayez.";
            }
            showMessage(errorMessage, 'error');
        }
    });
});