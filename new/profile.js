/**
 * * Fichier : profile.js
 * Rôle : Logique spécifique à la page de profil (Affichage des listes utilisateur, Déconnexion)
 * Page concernée : profile.html
 * */

// Importation des références Firebase et des utilitaires
import { auth, userDB, publicDB } from './firebase-config.js';
import { getCurrentUser } from './app-common.js';

// Références DOM
const profileUsername = document.getElementById('profileUsername');
const profileEmail = document.getElementById('profileEmail');
const logoutBtn = document.getElementById('logoutBtn');
const profileTabs = document.getElementById('profileTabs');
const loader = document.getElementById('loader');
const contentWrapper = document.getElementById('contentWrapper');

const sections = {
    favorites: document.getElementById('favorites'),
    myList: document.getElementById('myList'),
    downloads: document.getElementById('downloads')
};

let allContentCache = {}; // Cache pour stocker tous les films/séries chargés

// =========================================================================
// 1. UTILITAIRES DE RENDU
// =========================================================================

/**
 * Crée la carte de contenu pour les listes du profil.
 */
function makeProfileCard(key, content, listName) {
    const card = document.createElement('div');
    card.className = 'card profile-card';
    card.dataset.contentId = key;

    const type = content.type === 'series' ? 'Série' : 'Film';
    
    card.innerHTML = `
        <div class="card-image-wrapper">
            <img src="${content.image}" alt="${content.title}">
            <a href="watch.html?id=${key}" class="overlay-btn"><i class="fas fa-play"></i></a>
        </div>
        <div class="card-title">${content.title}</div>
        <div class="card-meta">${type} (${content.year || 'N/A'})</div>
        
        <button class="btn-remove" data-list="${listName}" data-id="${key}" title="Retirer de ${listName === 'favorites' ? 'mes favoris' : 'ma liste'}">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    // Ajouter l'écouteur pour le retrait
    card.querySelector('.btn-remove').addEventListener('click', handleRemoveItem);

    return card;
}


// =========================================================================
// 2. LOGIQUE UTILISATEUR ET DÉCONNEXION
// =========================================================================

/**
 * Gère la déconnexion de l'utilisateur.
 */
function handleLogout() {
    auth.signOut()
        .then(() => {
            // La redirection vers login.html est gérée par app-common.js via onAuthStateChanged
            console.log('Déconnexion réussie.');
        })
        .catch(error => {
            console.error('Erreur de déconnexion:', error);
            alert('Erreur lors de la déconnexion. Veuillez réessayer.');
        });
}

/**
 * Affiche les informations de l'utilisateur (nom et email).
 */
function renderUserInfo(user) {
    // Récupérer le nom d'utilisateur depuis la DB privée
    userDB.ref(`users/${user.uid}/username`).once('value')
        .then(snapshot => {
            const username = snapshot.val() || user.email.split('@')[0];
            profileUsername.textContent = username;
        })
        .catch(error => {
            console.error("Erreur de récupération du nom d'utilisateur:", error);
            profileUsername.textContent = "Utilisateur CINETV";
        });
        
    profileEmail.textContent = user.email;
    logoutBtn.addEventListener('click', handleLogout);
}

/**
 * Gère le retrait d'un élément d'une liste utilisateur.
 */
function handleRemoveItem(event) {
    const user = getCurrentUser();
    if (!user) return;

    const btn = event.currentTarget;
    const contentId = btn.dataset.id;
    const listName = btn.dataset.list;
    
    if (confirm(`Êtes-vous sûr de vouloir retirer cet élément de votre section "${listName}" ?`)) {
        userDB.ref(`users/${user.uid}/${listName}/${contentId}`).remove()
            .then(() => {
                alert(`Contenu retiré de ${listName}.`);
                // Recharger la liste actuelle après suppression
                loadContentForTab(listName); 
            })
            .catch(error => {
                console.error(`Erreur lors du retrait de ${listName}:`, error);
                alert("Erreur lors de la suppression. Veuillez réessayer.");
            });
    }
}


// =========================================================================
// 3. CHARGEMENT ET AFFICHAGE DES LISTES UTILISATEUR
// =========================================================================

/**
 * Charge les IDs d'une liste (favorites, myList, downloads) depuis la DB utilisateur
 * et récupère les détails du contenu.
 */
async function loadUserListContent(listName) {
    const user = getCurrentUser();
    const container = sections[listName];
    
    if (!user || !container) return;

    container.innerHTML = `<p style="text-align: center; color: var(--muted);">Chargement de vos ${listName}...</p>`;

    try {
        // 1. Récupérer les IDs stockés par l'utilisateur
        const listSnapshot = await userDB.ref(`users/${user.uid}/${listName}`).once('value');
        const contentIdsObject = listSnapshot.val();
        
        if (!contentIdsObject) {
            container.innerHTML = `<p style="text-align: center; color: var(--muted); padding: 50px;">Aucun élément trouvé dans vos ${listName === 'favorites' ? 'Favoris' : listName === 'myList' ? 'Listes' : 'Téléchargements'}.</p>`;
            return;
        }

        const contentIds = Object.keys(contentIdsObject);
        const fetchPromises = [];
        
        // 2. Récupérer les détails de chaque contenu à partir du cache ou de publicDB
        contentIds.forEach(id => {
            if (allContentCache[id]) {
                fetchPromises.push(Promise.resolve(allContentCache[id]));
            } else {
                fetchPromises.push(
                    publicDB.ref(`movies/${id}`).once('value')
                        .then(snapshot => {
                            const data = snapshot.val();
                            if (data) {
                                // Mettre en cache pour éviter les futurs appels DB
                                allContentCache[id] = { key: id, ...data };
                                return allContentCache[id];
                            }
                            return null;
                        })
                );
            }
        });

        // 3. Rendre les cartes
        const contents = (await Promise.all(fetchPromises)).filter(c => c !== null);
        
        container.innerHTML = ''; // Nettoyer le message de chargement
        contents.forEach(content => {
            container.appendChild(makeProfileCard(content.key, content, listName));
        });

    } catch (error) {
        console.error(`Erreur lors du chargement des ${listName}:`, error);
        container.innerHTML = `<p style="text-align: center; color: var(--error); padding: 50px;">Erreur de chargement. Veuillez vérifier votre connexion.</p>`;
    }
}

/**
 * Bascule entre les onglets du profil et charge le contenu approprié.
 */
function handleTabSwitching() {
    profileTabs.querySelectorAll('.profile-nav-item').forEach(tab => {
        tab.addEventListener('click', function() {
            const listName = this.dataset.tab;

            // Mettre à jour les classes actives de navigation
            profileTabs.querySelectorAll('.profile-nav-item').forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            // Afficher la section appropriée et masquer les autres
            Object.values(sections).forEach(section => section.classList.remove('active'));
            sections[listName].classList.add('active');

            // Charger le contenu pour l'onglet sélectionné
            loadContentForTab(listName);
        });
    });
}

/**
 * Fonction de commodité pour charger le contenu de l'onglet actif.
 */
function loadContentForTab(listName) {
    if (!sections[listName].dataset.loaded) {
        // Marquer comme chargé pour éviter les rechargements inutiles si l'on revient sur l'onglet
        // Sauf si l'utilisateur supprime un élément (où la fonction handleRemoveItem recharge spécifiquement)
        sections[listName].dataset.loaded = 'true';
    }
    loadUserListContent(listName);
}


// =========================================================================
// 4. INITIALISATION
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Récupérer l'utilisateur
    const user = getCurrentUser();
    
    // Si getCurrentUser() retourne null, l'utilisateur sera redirigé vers login.html 
    // par app-common.js, donc nous continuons seulement si 'user' est non-null.
    if (user) {
        if (contentWrapper) contentWrapper.style.opacity = 0;
        if (loader) loader.style.display = 'flex';
        
        // 2. Rendre les informations de l'utilisateur
        renderUserInfo(user);
        
        // 3. Initialiser les écouteurs de changement d'onglet
        handleTabSwitching();
        
        // 4. Charger le contenu par défaut (Favoris)
        loadContentForTab('favorites');

        // 5. Afficher le contenu
        if (contentWrapper) contentWrapper.style.opacity = 1;
        if (loader) loader.style.display = 'none';
    }
});