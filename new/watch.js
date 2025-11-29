/**
 * * Fichier : watch.js
 * Rôle : Logique spécifique à la page de visionnage (Lecteur, Auth, Favoris, Commentaires, Téléchargement/Monétisation)
 * Page concernée : watch.html
 * */

// Importation des références Firebase et de l'Adsterra Smartlink
import { publicDB, userDB, ADSTERRA_SMARTLINK } from './firebase-config.js';
import { getCurrentUser } from './app-common.js';

// Références DOM
const videoPlayer = document.getElementById('videoPlayer');
const contentTitle = document.getElementById('contentTitle');
const contentMeta = document.getElementById('contentMeta');
const contentDescription = document.getElementById('contentDescription');
const favoriteBtn = document.getElementById('favoriteBtn');
const myListBtn = document.getElementById('myListBtn');
const downloadBtn = document.getElementById('downloadBtn');
const commentInputSection = document.getElementById('commentInputSection');
const postCommentBtn = document.getElementById('postCommentBtn');
const commentTextarea = document.getElementById('commentText');
const commentList = document.getElementById('commentList');
const episodeSelectorContainer = document.getElementById('episodeSelectorContainer');
const episodeListContainer = document.getElementById('episodeList');
const loader = document.getElementById('loader');

let currentContentId = null;
let currentContentData = null;

// =========================================================================
// 1. CHARGEMENT INITIAL DES DONNÉES
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    if (loader) loader.style.display = 'flex';
    
    // Récupérer l'ID du contenu depuis l'URL (e.g., ?id=un_film_unique)
    const urlParams = new URLSearchParams(window.location.search);
    currentContentId = urlParams.get('id');

    if (currentContentId) {
        loadContentData(currentContentId);
    } else {
        // Redirection si aucun ID n'est trouvé
        alert("Contenu non spécifié.");
        window.location.href = 'home.html';
    }
});

/**
 * Charge les détails du contenu (film/série) depuis la base de données publique.
 * @param {string} id - L'ID du contenu.
 */
async function loadContentData(id) {
    try {
        const snapshot = await publicDB.ref('movies/' + id).once('value');
        currentContentData = snapshot.val();

        if (!currentContentData) {
            alert("Contenu introuvable.");
            window.location.href = 'home.html';
            return;
        }

        renderContentDetails(currentContentData);
        initializeUserInteractions(id);
        loadComments(id);
        
        // Gérer le sélecteur d'épisodes si c'est une série
        if (currentContentData.type === 'series' && currentContentData.episodes) {
            renderEpisodeSelector(currentContentData);
        }

    } catch (error) {
        console.error("Erreur de chargement du contenu:", error);
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

/**
 * Met à jour l'interface utilisateur avec les détails du contenu.
 */
function renderContentDetails(content) {
    // 1. Mise à jour des textes
    document.title = content.title + " | CINETV";
    contentTitle.textContent = content.title;
    contentDescription.textContent = content.description || "Description non disponible.";
    
    // 2. Mise à jour du lecteur (URL du premier épisode/film)
    const videoUrl = content.iframeUrl || (content.episodes && content.episodes['E01'] ? content.episodes['E01'].iframeUrl : '');
    videoPlayer.src = videoUrl;
    
    // 3. Métadonnées
    contentMeta.innerHTML = `
        <span>${content.year || 'N/A'}</span>
        <span>${content.type === 'series' ? 'Série TV' : 'Film'}</span>
        <span>${content.category || 'Catégorie inconnue'}</span>
    `;
}

// =========================================================================
// 2. LOGIQUE DU SÉLECTEUR D'ÉPISODES (Pour les Séries)
// =========================================================================

/**
 * Rend les boutons du sélecteur d'épisodes et gère le changement de lecteur.
 */
function renderEpisodeSelector(content) {
    episodeSelectorContainer.style.display = 'block';
    episodeListContainer.innerHTML = '';
    
    const episodes = content.episodes;
    let isFirst = true;

    // Supposons que les clés des épisodes sont 'E01', 'E02', etc.
    Object.entries(episodes).forEach(([key, episode]) => {
        const button = document.createElement('button');
        button.className = `btn btn-episode ${isFirst ? 'active' : ''}`;
        button.textContent = episode.title || `Épisode ${key.replace('E', '')}`;
        button.dataset.url = episode.iframeUrl;
        
        button.addEventListener('click', () => {
            // Changer la source du lecteur
            videoPlayer.src = button.dataset.url;
            // Mettre à jour les classes actives
            document.querySelectorAll('.btn-episode').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Mise à jour du titre pour afficher l'épisode
            contentTitle.textContent = `${content.title} - ${button.textContent}`;
        });

        episodeListContainer.appendChild(button);
        isFirst = false;
    });
}


// =========================================================================
// 3. LOGIQUE D'INTERACTION UTILISATEUR (Favoris, Ma Liste) (Point 3)
// =========================================================================

/**
 * Initialise l'état des boutons Favoris/Ma Liste et ajoute les écouteurs.
 * @param {string} contentId - L'ID du contenu.
 */
function initializeUserInteractions(contentId) {
    const user = getCurrentUser();

    // Masquer les sections si l'utilisateur n'est pas connecté
    if (!user) {
        commentInputSection.style.display = 'none';
        return;
    }
    
    // Afficher les sections si l'utilisateur est connecté
    commentInputSection.style.display = 'flex'; 

    // Références à la base de données privée de l'utilisateur
    const userFavoritesRef = userDB.ref(`users/${user.uid}/favorites/${contentId}`);
    const userMyListRef = userDB.ref(`users/${user.uid}/myList/${contentId}`);

    // Écouteurs pour mettre à jour l'état des boutons en temps réel
    userFavoritesRef.on('value', snapshot => updateButtonState(favoriteBtn, snapshot.exists(), 'favorite'));
    userMyListRef.on('value', snapshot => updateButtonState(myListBtn, snapshot.exists(), 'myList'));

    // Événements de clic
    favoriteBtn.addEventListener('click', () => toggleUserList(userFavoritesRef, 'favorite'));
    myListBtn.addEventListener('click', () => toggleUserList(userMyListRef, 'myList'));
    
    // Événement de clic sur le bouton de téléchargement (Monétisation)
    downloadBtn.addEventListener('click', handleDownloadAction);
}

/**
 * Met à jour l'état visuel d'un bouton (Favori/Ma Liste).
 */
function updateButtonState(button, isActive, type) {
    const icon = button.querySelector('i');
    const textSpan = button.querySelector('span');
    
    if (type === 'favorite') {
        if (isActive) {
            icon.classList.replace('far', 'fas'); // Cœur rempli
            icon.style.color = 'var(--brand-light)';
            textSpan.textContent = "J'aime (Retirer)";
        } else {
            icon.classList.replace('fas', 'far'); // Cœur vide
            icon.style.color = 'var(--text)';
            textSpan.textContent = "J'aime";
        }
    } else if (type === 'myList') {
        if (isActive) {
            button.classList.add('btn-active');
            textSpan.textContent = "Dans Ma Liste (Retirer)";
        } else {
            button.classList.remove('btn-active');
            textSpan.textContent = "Ma Liste";
        }
    }
}

/**
 * Ajoute ou retire un contenu d'une liste utilisateur.
 */
function toggleUserList(dbRef, listName) {
    dbRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Retirer de la liste
            dbRef.remove().then(() => {
                alert(`${currentContentData.title} retiré de votre ${listName === 'favorite' ? 'Favoris' : 'Liste'}.`);
            });
        } else {
            // Ajouter à la liste
            dbRef.set(Date.now()).then(() => {
                alert(`${currentContentData.title} ajouté à votre ${listName === 'favorite' ? 'Favoris' : 'Liste'} !`);
            });
        }
    }).catch(error => {
        console.error(`Erreur lors de la mise à jour de ${listName}:`, error);
    });
}


// =========================================================================
// 4. LOGIQUE DE TÉLÉCHARGEMENT ET MONÉTISATION (Point 4 & 6)
// =========================================================================

/**
 * Gère le clic sur le bouton de téléchargement.
 */
function handleDownloadAction() {
    const user = getCurrentUser();
    
    if (!user) {
        alert("Veuillez vous connecter pour accéder aux liens de téléchargement.");
        window.location.href = 'login.html';
        return;
    }
    
    // 1. Enregistrer l'action de téléchargement dans la DB utilisateur
    userDB.ref(`users/${user.uid}/downloads/${currentContentId}`).set({
        timestamp: Date.now(),
        title: currentContentData.title,
        linkOpened: true
    }).catch(error => {
        console.error("Erreur lors de l'enregistrement de l'action de téléchargement:", error);
    });

    // 2. Ouvrir le Smartlink Adsterra (Monétisation)
    window.open(ADSTERRA_SMARTLINK, '_blank');

    // 3. Ouvrir le lien de téléchargement (supposons qu'il y ait un lien "telechargerUrl" dans la DB publique)
    // Nous ajoutons un court délai pour laisser la pop-up Adsterra s'ouvrir en premier.
    const downloadLink = currentContentData.telechargerUrl || ADSTERRA_SMARTLINK; // Utiliser Adsterra comme fallback
    
    setTimeout(() => {
        window.open(downloadLink, '_blank');
    }, 500); // 0.5 seconde de délai

    alert("Le lien de téléchargement s'ouvre dans un nouvel onglet, ainsi qu'une page de publicité pour soutenir CINETV.");
}


// =========================================================================
// 5. LOGIQUE DES COMMENTAIRES (Point 5)
// =========================================================================

/**
 * Charge et affiche les commentaires pour le contenu.
 */
function loadComments(contentId) {
    // Écouteur en temps réel pour les commentaires de ce contenu
    publicDB.ref(`comments/${contentId}`).on('value', (snapshot) => {
        commentList.innerHTML = '';
        const comments = snapshot.val();
        
        if (comments) {
            // Convertir en tableau et trier par timestamp (le plus récent en premier)
            const sortedComments = Object.entries(comments)
                .map(([key, comment]) => ({ key, ...comment }))
                .sort((a, b) => b.timestamp - a.timestamp);

            sortedComments.forEach(comment => {
                const commentElement = document.createElement('div');
                commentElement.className = 'comment-item';
                commentElement.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${comment.username || 'Anonyme'}</span>
                        <span class="comment-date">${new Date(comment.timestamp).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p class="comment-text">${comment.text}</p>
                `;
                commentList.appendChild(commentElement);
            });
        } else {
            commentList.innerHTML = '<p style="color: var(--muted); text-align: center;">Soyez le premier à commenter !</p>';
        }
    });
}

/**
 * Publie un nouveau commentaire.
 */
postCommentBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    const commentText = commentTextarea.value.trim();

    if (!user) {
        alert("Vous devez être connecté pour poster un commentaire.");
        return;
    }
    
    if (commentText.length < 5) {
        alert("Votre commentaire est trop court.");
        return;
    }

    // Récupérer le nom d'utilisateur (peut être stocké dans le nœud utilisateur)
    userDB.ref(`users/${user.uid}/username`).once('value').then(usernameSnapshot => {
        const username = usernameSnapshot.val() || user.email.split('@')[0];

        const newComment = {
            userId: user.uid,
            username: username,
            text: commentText,
            timestamp: Date.now()
        };

        // Publier dans la base de données publique
        publicDB.ref(`comments/${currentContentId}`).push(newComment)
            .then(() => {
                commentTextarea.value = ''; // Nettoyer le champ
            })
            .catch(error => {
                console.error("Erreur lors de l'envoi du commentaire:", error);
                alert("Erreur lors de l'envoi du commentaire. Réessayez.");
            });
    });
});