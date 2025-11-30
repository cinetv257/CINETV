// firebase-config.js
// Double configuration Firebase pour CINETV

// Configuration pour les données PUBLIQUES (films, séries, vidéos)
const publicFirebaseConfig = {
    apiKey: "AIzaSyB77EmeaPTvtXCH4EL-1E1SgmyW6Yz9lLI",
    authDomain: "cinetv257.firebaseapp.com",
    databaseURL: "https://cinetv257-default-rtdb.firebaseio.com",
    projectId: "cinetv257",
    storageBucket: "cinetv257.appspot.com",
    messagingSenderId: "402664770835",
    appId: "1:402664770835:web:1adaea98f40ca609645ee6"
};

// Configuration pour l'AUTHENTIFICATION et données UTILISATEUR
const authFirebaseConfig = {
    
    apiKey: "AIzaSyC9tJnthnxnNyTvurKGw4Z6ujXlbkEJ0pE",
    authDomain: "ciinetvbase.firebaseapp.com",
    projectId: "ciinetvbase",
    storageBucket: "ciinetvbase.firebasestorage.app",
    messagingSenderId: "227737440438",
    appId: "1:227737440438:web:89f7622c92be8287185617",
    measurementId: "G-VWZ4P2DHPR"
};

// Vérifier si Firebase est déjà initialisé
let publicApp, authApp, publicDb, authDb, publicAuth, authAuth;

try {
    // Initialiser l'application pour les données publiques
    publicApp = firebase.initializeApp(publicFirebaseConfig, 'public');
    
    // Initialiser l'application pour l'authentification
    authApp = firebase.initializeApp(authFirebaseConfig, 'auth');
    
    // Références aux bases de données
    publicDb = firebase.database(publicApp);
    authDb = firebase.database(authApp);
    
    // Références aux services d'authentification
    publicAuth = firebase.auth(publicApp);
    authAuth = firebase.auth(authApp);
    
    console.log('✅ Configuration Firebase initialisée avec succès');
    console.log('📊 Base publique:', publicFirebaseConfig.projectId);
    console.log('🔐 Base auth:', authFirebaseConfig.projectId);
    
} catch (error) {
    console.error('❌ Erreur lors de l\'initialisation Firebase:', error);
    
    // Si déjà initialisé, utiliser les instances existantes
    if (error.code === 'app/duplicate-app') {
        publicApp = firebase.app('public');
        authApp = firebase.app('auth');
        publicDb = firebase.database(publicApp);
        authDb = firebase.database(authApp);
        publicAuth = firebase.auth(publicApp);
        authAuth = firebase.auth(authApp);
        console.log('🔄 Applications Firebase récupérées');
    }
}

// Classes pour gérer les données utilisateur
class UserDataManager {
    constructor(userId) {
        this.userId = userId;
        this.userRef = authDb.ref('users/' + userId);
    }

    // ========== GESTION DES FAVORIS ==========
    async addToFavorites(movieId, movieData) {
        try {
            await this.userRef.child('favorites/' + movieId).set({
                ...movieData,
                addedAt: Date.now(),
                type: movieData.type || 'movie'
            });
            console.log('✅ Ajouté aux favoris:', movieId);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur ajout favoris:', error);
            return { success: false, error: error.message };
        }
    }

    async removeFromFavorites(movieId) {
        try {
            await this.userRef.child('favorites/' + movieId).remove();
            console.log('❌ Retiré des favoris:', movieId);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression favoris:', error);
            return { success: false, error: error.message };
        }
    }

    async getFavorites() {
        try {
            const snapshot = await this.userRef.child('favorites').once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('❌ Erreur récupération favoris:', error);
            return {};
        }
    }

    async isInFavorites(movieId) {
        try {
            const snapshot = await this.userRef.child('favorites/' + movieId).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('❌ Erreur vérification favoris:', error);
            return false;
        }
    }

    // ========== GESTION DE "MA LISTE" ==========
    async addToMyList(movieId, movieData) {
        try {
            await this.userRef.child('myList/' + movieId).set({
                ...movieData,
                addedAt: Date.now(),
                type: movieData.type || 'movie'
            });
            console.log('✅ Ajouté à ma liste:', movieId);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur ajout ma liste:', error);
            return { success: false, error: error.message };
        }
    }

    async removeFromMyList(movieId) {
        try {
            await this.userRef.child('myList/' + movieId).remove();
            console.log('❌ Retiré de ma liste:', movieId);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression ma liste:', error);
            return { success: false, error: error.message };
        }
    }

    async getMyList() {
        try {
            const snapshot = await this.userRef.child('myList').once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('❌ Erreur récupération ma liste:', error);
            return {};
        }
    }

    async isInMyList(movieId) {
        try {
            const snapshot = await this.userRef.child('myList/' + movieId).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('❌ Erreur vérification ma liste:', error);
            return false;
        }
    }

    // ========== GESTION DES TÉLÉCHARGEMENTS ==========
    async addDownload(movieId, downloadData) {
        try {
            await this.userRef.child('downloads/' + movieId).set({
                ...downloadData,
                downloadedAt: Date.now(),
                downloadUrl: downloadData.downloadUrl || '',
                fileSize: downloadData.fileSize || 'N/A'
            });
            console.log('✅ Téléchargement enregistré:', movieId);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur enregistrement téléchargement:', error);
            return { success: false, error: error.message };
        }
    }

    async getDownloads() {
        try {
            const snapshot = await this.userRef.child('downloads').once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('❌ Erreur récupération téléchargements:', error);
            return {};
        }
    }

    // ========== PROFIL UTILISATEUR ==========
    async updateProfile(profileData) {
        try {
            await this.userRef.child('profile').update(profileData);
            console.log('✅ Profil mis à jour');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur mise à jour profil:', error);
            return { success: false, error: error.message };
        }
    }

    async getProfile() {
        try {
            const snapshot = await this.userRef.child('profile').once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('❌ Erreur récupération profil:', error);
            return {};
        }
    }
}

// Gestionnaire d'authentification
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userDataManager = null;
        this.initAuthListener();
    }

    initAuthListener() {
        authAuth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            
            if (user) {
                this.userDataManager = new UserDataManager(user.uid);
                console.log('👤 Utilisateur connecté:', user.email);
                
                // Créer le profil s'il n'existe pas
                await this.createUserProfileIfNeeded(user);
            } else {
                this.userDataManager = null;
                console.log('👤 Utilisateur déconnecté');
            }
            
            this.updateUI();
        });
    }

    async createUserProfileIfNeeded(user) {
        try {
            const userRef = authDb.ref('users/' + user.uid + '/profile');
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                await userRef.set({
                    name: user.displayName || 'Utilisateur CINETV',
                    email: user.email,
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    preferences: {
                        language: 'fr',
                        notifications: true,
                        autoPlay: true
                    }
                });
                console.log('✅ Profil utilisateur créé');
            } else {
                // Mettre à jour la dernière connexion
                await userRef.child('lastLogin').set(Date.now());
            }
        } catch (error) {
            console.error('❌ Erreur création profil:', error);
        }
    }

    async login(email, password) {
        try {
            const result = await authAuth.signInWithEmailAndPassword(email, password);
            return { 
                success: true, 
                user: result.user,
                message: 'Connexion réussie !'
            };
        } catch (error) {
            let errorMessage = 'Erreur de connexion';
            
            switch(error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Email invalide';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Compte désactivé';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Utilisateur non trouvé';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Mot de passe incorrect';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Trop de tentatives. Réessayez plus tard';
                    break;
            }
            
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    }

    async register(email, password, name) {
        try {
            const result = await authAuth.createUserWithEmailAndPassword(email, password);
            
            // Mettre à jour le profil Firebase Auth
            await result.user.updateProfile({
                displayName: name
            });
            
            console.log('✅ Utilisateur créé:', result.user.uid);
            
            return { 
                success: true, 
                user: result.user,
                message: 'Compte créé avec succès !'
            };
        } catch (error) {
            let errorMessage = 'Erreur lors de la création du compte';
            
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Cet email est déjà utilisé';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email invalide';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Mot de passe trop faible';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Création de compte temporairement désactivée';
                    break;
            }
            
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    }

    async logout() {
        try {
            await authAuth.signOut();
            return { success: true, message: 'Déconnexion réussie' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await authAuth.sendPasswordResetEmail(email);
            return { success: true, message: 'Email de réinitialisation envoyé' };
        } catch (error) {
            return { success: false, error: 'Erreur lors de l\'envoi de l\'email' };
        }
    }

    updateUI() {
        // Mettre à jour l'interface en fonction de l'état de connexion
        const loginButtons = document.querySelectorAll('.login-btn, .auth-btn');
        const profileButtons = document.querySelectorAll('.profile-btn, .user-menu');
        const userNames = document.querySelectorAll('.user-name');
        
        if (this.currentUser) {
            // Utilisateur connecté
            loginButtons.forEach(btn => btn.style.display = 'none');
            profileButtons.forEach(btn => btn.style.display = 'block');
            userNames.forEach(element => {
                element.textContent = this.currentUser.displayName || 'Mon Profil';
            });
        } else {
            // Utilisateur non connecté
            loginButtons.forEach(btn => btn.style.display = 'block');
            profileButtons.forEach(btn => btn.style.display = 'none');
        }
    }

    // Getter pour le gestionnaire de données utilisateur
    getUserDataManager() {
        return this.userDataManager;
    }

    // Vérifier si l'utilisateur est connecté
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Obtenir l'ID utilisateur
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }
}

// Initialiser le gestionnaire d'authentification
const authManager = new AuthManager();

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        publicDb,
        authDb,
        publicAuth,
        authAuth,
        authManager,
        UserDataManager
    };
},
        UserDataManager
    };
}