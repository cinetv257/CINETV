import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    setDoc,
    doc,
    serverTimestamp
} from './firebase-config.js';

// État global
let currentUser = null;
let authInitialized = false;
let authStateListeners = [];

// Initialiser l'authentification
export const initAuth = (callback) => {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            console.log('État auth changé:', user ? 'Connecté' : 'Déconnecté');
            currentUser = user;
            authInitialized = true;
            
            if (user) {
                // Utilisateur connecté
                console.log('Utilisateur connecté:', user.email, user.uid);
                
                // Mettre à jour le dernier accès
                updateUserLastSeen(user.uid);
                
                // Notifier les écouteurs
                notifyAuthStateChange(true, user);
                
                // Exécuter le callback si fourni
                if (callback) callback(true, user);
                
                // Redirection conditionnelle
                handleRedirect(user);
                
            } else {
                // Utilisateur non connecté
                console.log('Utilisateur non connecté');
                
                // Notifier les écouteurs
                notifyAuthStateChange(false, null);
                
                // Exécuter le callback si fourni
                if (callback) callback(false, null);
                
                // Redirection conditionnelle
                handleRedirect(null);
            }
            
            resolve(user);
        }, (error) => {
            console.error("Erreur d'authentification:", error);
            authInitialized = true;
            
            // En cas d'erreur, considérer comme non connecté
            currentUser = null;
            notifyAuthStateChange(false, null);
            
            // Ne pas rediriger immédiatement en cas d'erreur
            setTimeout(() => {
                if (!auth.currentUser) {
                    console.log('Redirection après erreur d\'auth');
                    // Seulement rediriger des pages protégées
                    const protectedPages = ['dashboard.html', 'chat.html', 'story.html', 'profile.html'];
                    const currentPage = window.location.pathname.split('/').pop();
                    
                    if (protectedPages.includes(currentPage)) {
                        window.location.href = 'index.html';
                    }
                }
            }, 2000);
            
            resolve(null);
        });
    });
};

// Gérer la redirection
const handleRedirect = (user) => {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages publiques
    const publicPages = ['index.html', 'register.html', ''];
    
    // Pages protégées
    const protectedPages = ['dashboard.html', 'chat.html', 'story.html', 'profile.html'];
    
    if (user) {
        // Utilisateur connecté
        if (publicPages.includes(currentPage)) {
            console.log('Redirection vers dashboard');
            window.location.href = 'dashboard.html';
        }
    } else {
        // Utilisateur non connecté
        if (protectedPages.includes(currentPage)) {
            console.log('Redirection vers index');
            window.location.href = 'index.html';
        }
    }
};

// Inscription utilisateur
export const registerUser = async (email, password, name, profileImage = null) => {
    try {
        console.log('Tentative d\'inscription:', email);
        
        // Créer l'utilisateur avec email et mot de passe
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Utilisateur créé:', user.uid);
        
        // Mettre à jour le profil avec le nom
        await updateProfile(user, {
            displayName: name,
            photoURL: profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        });
        console.log('Profil mis à jour');
        
        // Créer le document utilisateur dans Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            name: name,
            photoURL: profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            status: "En ligne",
            lastSeen: serverTimestamp(),
            createdAt: serverTimestamp()
        });
        console.log('Document utilisateur créé dans Firestore');
        
        return { success: true, user: user };
    } catch (error) {
        console.error("Erreur d'inscription:", error.code, error.message);
        let errorMessage = "Une erreur est survenue";
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "Cette adresse email est déjà utilisée";
                break;
            case 'auth/invalid-email':
                errorMessage = "Adresse email invalide";
                break;
            case 'auth/weak-password':
                errorMessage = "Le mot de passe est trop faible (minimum 6 caractères)";
                break;
            case 'auth/operation-not-allowed':
                errorMessage = "L'inscription par email/mot de passe n'est pas activée";
                break;
        }
        
        return { success: false, error: errorMessage };
    }
};

// Connexion utilisateur
export const loginUser = async (email, password) => {
    try {
        console.log('Tentative de connexion:', email);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Connexion réussie:', user.uid);
        
        return { success: true, user: user };
    } catch (error) {
        console.error("Erreur de connexion:", error.code, error.message);
        let errorMessage = "Email ou mot de passe incorrect";
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = "Aucun compte trouvé avec cet email";
                break;
            case 'auth/wrong-password':
                errorMessage = "Mot de passe incorrect";
                break;
            case 'auth/invalid-email':
                errorMessage = "Adresse email invalide";
                break;
            case 'auth/user-disabled':
                errorMessage = "Ce compte a été désactivé";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Trop de tentatives. Réessayez plus tard";
                break;
        }
        
        return { success: false, error: errorMessage };
    }
};

// Déconnexion
export const logoutUser = async () => {
    try {
        console.log('Tentative de déconnexion');
        
        // Mettre le statut à "Hors ligne" avant de se déconnecter
        if (auth.currentUser) {
            await updateUserStatus(auth.currentUser.uid, "Hors ligne");
        }
        
        await signOut(auth);
        console.log('Déconnexion réussie');
        return { success: true };
    } catch (error) {
        console.error("Erreur de déconnexion:", error);
        return { success: false, error: error.message };
    }
};

// Mettre à jour le statut de l'utilisateur
export const updateUserStatus = async (userId, status) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            status: status,
            lastSeen: serverTimestamp()
        });
        console.log('Statut mis à jour:', status);
    } catch (error) {
        console.error("Erreur de mise à jour du statut:", error);
    }
};

// Mettre à jour le dernier accès
export const updateUserLastSeen = async (userId) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            lastSeen: serverTimestamp()
        });
    } catch (error) {
        console.error("Erreur de mise à jour du dernier accès:", error);
    }
};

// Obtenir l'utilisateur courant
export const getCurrentUser = () => {
    if (!authInitialized) {
        console.warn('Auth pas encore initialisée');
        return null;
    }
    return currentUser || auth.currentUser;
};

// Vérifier si l'authentification est initialisée
export const isAuthInitialized = () => {
    return authInitialized;
};

// Attendre que l'authentification soit initialisée
export const waitForAuth = () => {
    return new Promise((resolve) => {
        if (authInitialized) {
            resolve(currentUser);
        } else {
            const checkAuth = setInterval(() => {
                if (authInitialized) {
                    clearInterval(checkAuth);
                    resolve(currentUser);
                }
            }, 100);
        }
    });
};

// Ajouter un écouteur pour les changements d'état
export const addAuthStateListener = (callback) => {
    authStateListeners.push(callback);
};

// Notifier les écouteurs
const notifyAuthStateChange = (isLoggedIn, user) => {
    authStateListeners.forEach(listener => {
        try {
            listener(isLoggedIn, user);
        } catch (error) {
            console.error('Erreur dans le listener auth:', error);
        }
    });
};

// Réinitialiser le mot de passe
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error("Erreur de réinitialisation:", error);
        return { success: false, error: error.message };
    }
};

// Vérifier si l'utilisateur est connecté
export const isUserLoggedIn = () => {
    return authInitialized && currentUser !== null;
};

// Obtenir le token d'authentification
export const getAuthToken = async () => {
    if (currentUser) {
        try {
            const token = await currentUser.getIdToken();
            return token;
        } catch (error) {
            console.error('Erreur de récupération du token:', error);
            return null;
        }
    }
    return null;
};