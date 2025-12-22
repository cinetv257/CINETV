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

// Vérifier l'état d'authentification
export const initAuth = () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Utilisateur connecté
            console.log('Utilisateur connecté:', user.email);
            
            // Rediriger vers le dashboard si on est sur la page de login
            if (window.location.pathname.includes('index.html') || 
                window.location.pathname.includes('register.html')) {
                window.location.href = 'dashboard.html';
            }
            
            // Mettre à jour le dernier accès
            updateUserLastSeen(user.uid);
        } else {
            // Utilisateur non connecté
            console.log('Utilisateur non connecté');
            
            // Rediriger vers la page de login si nécessaire
            if (!window.location.pathname.includes('index.html') && 
                !window.location.pathname.includes('register.html')) {
                window.location.href = 'index.html';
            }
        }
    });
};

// Inscription utilisateur
export const registerUser = async (email, password, name, profileImage = null) => {
    try {
        // Créer l'utilisateur avec email et mot de passe
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Mettre à jour le profil avec le nom
        await updateProfile(user, {
            displayName: name,
            photoURL: profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        });
        
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
        
        return { success: true, user: user };
    } catch (error) {
        console.error("Erreur d'inscription:", error);
        return { success: false, error: error.message };
    }
};

// Connexion utilisateur
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Erreur de connexion:", error);
        return { success: false, error: error.message };
    }
};

// Déconnexion
export const logoutUser = async () => {
    try {
        // Mettre le statut à "Hors ligne" avant de se déconnecter
        if (auth.currentUser) {
            await updateUserStatus(auth.currentUser.uid, "Hors ligne");
        }
        
        await signOut(auth);
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
    return auth.currentUser;
};