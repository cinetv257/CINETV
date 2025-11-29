/**
 * * Fichier : app-common.js
 * Rôle : Logique JavaScript commune à toutes les pages (Auth Status, UI globales, Utilitaires).
 * */

// Importation des références Firebase depuis notre fichier de configuration
import { auth, userDB, publicDB } from './firebase-config.js';

// =========================================================================
// 1. GESTION DE L'AUTHENTIFICATION (Point 3)
// =========================================================================

let currentUser = null; // Variable globale pour stocker l'objet utilisateur

/**
 * Met à jour les éléments de l'interface utilisateur liés à l'authentification.
 * @param {object | null} user - L'objet utilisateur Firebase ou null si déconnecté.
 */
function updateAuthUI(user) {
    const authBtnTop = document.getElementById('auth-action-btn');
    const authBtnBottom = document.getElementById('bottomAuthAction');
    
    // Si l'utilisateur est connecté
    if (user) {
        currentUser = user;
        
        // --- Bouton Navbar (Top) ---
        if (authBtnTop) {
            authBtnTop.classList.remove('fa-sign-in-alt');
            authBtnTop.classList.add('fa-user-circle'); // Icône de profil
            authBtnTop.title = 'Mon Profil';
            authBtnTop.parentElement.href = 'profile.html'; // Redirige vers la nouvelle page
        }

        // --- Bouton Navigation Basse (Bottom Nav) ---
        if (authBtnBottom) {
            authBtnBottom.href = 'profile.html';
            authBtnBottom.querySelector('span').textContent = 'Profil';
            // Assurez-vous que l'icône est correcte (fa-user est déjà utilisé, c'est bon)
        }
        
    } else {
        currentUser = null;
        
        // --- Bouton Navbar (Top) ---
        if (authBtnTop) {
            authBtnTop.classList.remove('fa-user-circle');
            authBtnTop.classList.add('fa-sign-in-alt'); // Icône de connexion
            authBtnTop.title = 'Connexion';
            authBtnTop.parentElement.href = 'login.html';
        }

        // --- Bouton Navigation Basse (Bottom Nav) ---
        if (authBtnBottom) {
            authBtnBottom.href = 'login.html';
            authBtnBottom.querySelector('span').textContent = 'Connexion';
        }
    }
}

// Écouteur d'état d'authentification Firebase
auth.onAuthStateChanged((user) => {
    updateAuthUI(user);

    // Si l'utilisateur est sur la page de login et est connecté, on le redirige
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = 'home.html';
    }
    
    // Si l'utilisateur est sur la page de profil et n'est PAS connecté, on le redirige vers login
    if (!user && window.location.pathname.includes('profile.html')) {
        window.location.href = 'login.html';
    }
});


// =========================================================================
// 2. GESTION DES ÉLÉMENTS UI GÉNÉRAUX
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Gestion de l'ouverture du Modal de Recherche
    const topSearch = document.getElementById('topSearch');
    const bottomSearch = document.getElementById('bottomSearch');
    const searchModal = document.getElementById('searchModal');
    const closeSearch = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput');

    function openSearch() {
        if (searchModal) {
            searchModal.style.display = 'flex';
            searchInput.focus();
        }
    }

    if (topSearch) topSearch.addEventListener('click', openSearch);
    if (bottomSearch) bottomSearch.addEventListener('click', openSearch);

    if (closeSearch) {
        closeSearch.addEventListener('click', () => {
            searchModal.style.display = 'none';
        });
    }

    // Gestion de la recherche en temps réel (réutilisée sur toutes les pages)
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
});

/**
 * Fonction de recherche dans la base de données publique.
 */
function handleSearchInput() {
    const query = this.value.toLowerCase();
    const resultsWrapper = document.getElementById('searchResults');
    resultsWrapper.innerHTML = ''; // Nettoyer les anciens résultats
    
    if (!query || query.length < 3) return;

    // Charger les données de films/séries de la base publique (publicDB)
    publicDB.ref('movies').once('value').then(snapshot => {
        const movies = snapshot.val();
        if (!movies) return;

        Object.entries(movies).forEach(([key, movie]) => {
            // Recherche simple par titre
            if (movie.title && movie.title.toLowerCase().includes(query)) {
                // Fonction makeCard doit être implémentée dans les scripts spécifiques (home.js, etc.)
                // Pour l'instant, nous affichons un placeholder :
                const card = document.createElement('a');
                card.href = `watch.html?id=${key}`;
                card.className = 'card';
                card.style.width = '120px'; // Utilise le style de la carte défini dans style.css
                card.innerHTML = `
                    <div class="card-image-wrapper">
                        <img src="${movie.image || 'placeholder.jpg'}" alt="${movie.title}">
                    </div>
                    <div class="card-title">${movie.title}</div>
                `;
                resultsWrapper.appendChild(card);
            }
        });
    }).catch(error => {
        console.error("Erreur lors de la recherche Firebase:", error);
    });
}


// =========================================================================
// 3. FONCTIONS UTILITAIRES EXPORTABLES
// =========================================================================

/**
 * Fonction de debounce pour limiter les appels de recherche.
 * @param {function} func - La fonction à exécuter.
 * @param {number} delay - Le délai en millisecondes.
 */
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Fonction utilitaire pour vérifier l'état de l'utilisateur
 * @returns {object | null} L'objet utilisateur ou null.
 */
export function getCurrentUser() {
    return currentUser;
}