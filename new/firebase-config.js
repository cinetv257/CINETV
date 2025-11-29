/**
 * * Fichier : firebase-config.js
 * Rôle : Initialiser les deux applications Firebase (Public et Utilisateur)
 * */

// =========================================================================
// 1. DÉFINITION DES CLÉS (À REMPLACER PAR VOS VRAIES CLÉS)
// =========================================================================

// Configuration de l'Application 1 : Données Publiques (Films/Séries)
// L'API Key doit être la même si vous utilisez le même projet pour les deux DB.
// Seul le databaseURL diffère si vous avez deux projets/bases de données différentes,
// mais ici, nous supposons que vous utilisez la DB par défaut pour les films 
// et la même pour l'authentification/profil utilisateur.
const firebaseConfig = {
    apiKey: "VOTRE_CLE_API_COMMUNE",
    authDomain: "VOTRE_PROJET.firebaseapp.com",
    databaseURL: "https://VOTRE_BASE_DE_DONNEES_PAR_DEFAUT.firebaseio.com",
    projectId: "VOTRE_PROJET",
    storageBucket: "VOTRE_PROJET.appspot.com",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};

// =========================================================================
// 2. INITIALISATION DES APPLICATIONS
// =========================================================================

// Application 1 : PUBLIC (Utilisée pour lire les données des films/séries)
// C'est l'application par défaut, qui sera utilisée pour les données de contenu.
const appPublic = firebase.initializeApp(firebaseConfig);
export const publicDB = appPublic.database();
export const authPublic = appPublic.auth(); // Bien qu'inutile pour le public, on l'initialise.

// Application 2 : UTILISATEUR/PRIVÉE (Utilisée pour l'Auth et les données utilisateur)
// Nous réutilisons la même configuration (même projet Firebase) mais l'initialisons 
// avec un nom secondaire ("cineTvUsers").
// Ceci est crucial pour utiliser .auth() et .database() pour les données privées 
// et garantir que les appels ciblent la bonne base.
const appUsers = firebase.initializeApp(firebaseConfig, "cineTvUsers");
export const auth = appUsers.auth();
export const userDB = appUsers.database();

// =s=======================================================================
// 3. EXPORT DES CONSTANTES UTILES
// =========================================================================

// Exportations pour faciliter l'importation dans les autres fichiers JS
// Attention : `auth` et `userDB` sont les références PRINCIPALES que nous utiliserons 
// pour la gestion de l'utilisateur (login, favoris, etc.).

// Export du lien Adsterra pour la monétisation centralisée (Point 6)
export const ADSTERRA_SMARTLINK = "https://effectivegatecpm.com/wu0xndpxcg?key=962747162b526b8e35632b7e46f1e881";