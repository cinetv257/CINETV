/**
 * * Fichier : tvshow.js
 * Rôle : Logique spécifique à la page des séries TV (Chargement de données, Filtrage, Affichage)
 * Page concernée : tvshow.html
 * */

// Importation des références Firebase
import { publicDB } from './firebase-config.js';
import { debounce } from './app-common.js'; // Importation de la fonction debounce (bien que non utilisée ici, elle pourrait l'être pour d'autres fonctionnalités)

// Références DOM
const tvShowGrid = document.getElementById('tvShowGrid');
const yearFilter = document.getElementById('yearFilter');
const visibleCategoriesContainer = document.getElementById('visibleCategories');
const allCategoriesContainer = document.getElementById('allCategories');
const seeMoreCatsBtn = document.getElementById('seeMoreCats');
const currentCategoryTitle = document.getElementById('currentCategoryTitle');
const loader = document.getElementById('loader');
const contentWrapper = document.getElementById('contentWrapper');

let allTvShows = []; // Stocke toutes les séries pour le filtrage local
let currentFilters = {
    category: 'Tous',
    year: ''
};
let availableCategories = new Set();
let availableYears = new Set();

// =========================================================================
// 1. UTILITAIRES DE RENDU
// =========================================================================

/**
 * Crée la carte de série pour la grille.
 */
function makeCard(key, content) {
    const card = document.createElement('a');
    card.href = `watch.html?id=${key}`;
    card.className = 'card'; // Utilise la classe CSS globale 'card'

    // Afficher le nombre de saisons si disponible
    const seasons = content.seasons ? ` - ${content.seasons} Saisons` : '';

    card.innerHTML = `
        <div class="card-image-wrapper">
            <img src="${content.image}" alt="${content.title}">
        </div>
        <div class="card-title">${content.title}</div>
        <div class="card-meta">${content.year || ''} ${seasons}</div>
    `;
    return card;
}

// =========================================================================
// 2. CHARGEMENT ET PRÉPARATION DES DONNÉES
// =========================================================================

/**
 * Charge toutes les séries depuis la base de données publique.
 */
async function loadTvShows() {
    if (loader) loader.style.display = 'flex';
    
    try {
        const snapshot = await publicDB.ref('movies')
            .orderByChild('type')
            .equalTo('series') // Filtre côté Firebase pour n'obtenir que les séries
            .once('value');
            
        const contentObject = snapshot.val();
        
        if (!contentObject) {
            allTvShows = [];
            return;
        }

        allTvShows = Object.entries(contentObject).map(([key, content]) => ({ key, ...content }));
        
        // Collecter les catégories et les années pour les filtres
        availableCategories.clear();
        availableYears.clear();
        allTvShows.forEach(show => {
            if (show.category) {
                show.category.split(',').map(c => c.trim()).forEach(c => availableCategories.add(c));
            }
            if (show.year) {
                availableYears.add(show.year.toString());
            }
        });

    } catch (error) {
        console.error("Erreur lors du chargement des séries TV:", error);
        allTvShows = [];
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

// =========================================================================
// 3. GESTION DES FILTRES
// =========================================================================

/**
 * Rend les options de catégorie et d'année dans l'interface utilisateur.
 */
function renderFilters() {
    // --- Années ---
    yearFilter.innerHTML = '<option value="">Année (Toutes)</option>';
    const sortedYears = Array.from(availableYears).sort().reverse();
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
    
    // --- Catégories ---
    const sortedCategories = Array.from(availableCategories).sort();
    
    visibleCategoriesContainer.innerHTML = '';
    allCategoriesContainer.innerHTML = '';

    const allCats = ['Tous', ...sortedCategories];
    
    allCats.forEach((cat, index) => {
        const catElement = createCategoryButton(cat);
        
        if (index < 8) { // Afficher les 8 premières + 'Tous'
            visibleCategoriesContainer.appendChild(catElement);
        } else {
            allCategoriesContainer.appendChild(catElement);
        }
    });
}

/**
 * Crée un bouton/tag de catégorie.
 */
function createCategoryButton(categoryName) {
    const button = document.createElement('button');
    button.textContent = categoryName;
    button.className = 'btn-category'; // Classe CSS pour les tags de catégorie
    if (categoryName === currentFilters.category) {
        button.classList.add('active');
    }
    
    button.addEventListener('click', () => handleFilterChange('category', categoryName));
    return button;
}

/**
 * Gère le changement d'un filtre.
 */
function handleFilterChange(type, value) {
    // Mettre à jour les filtres
    currentFilters[type] = value;

    // Mettre à jour l'affichage du titre
    if (type === 'category') {
        currentCategoryTitle.textContent = currentFilters.category === 'Tous' 
            ? 'Toutes les séries' 
            : `Séries : ${currentFilters.category}`;
            
        // Mettre à jour l'état actif des boutons de catégorie
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent === value) {
                btn.classList.add('active');
            }
        });
    }

    // Si c'est le filtre d'année (select), il se met à jour automatiquement

    // Appliquer le filtrage
    applyFilters();
}

/**
 * Applique tous les filtres actifs et rend la grille de séries.
 */
function applyFilters() {
    let filteredTvShows = allTvShows;

    // 1. Filtrer par Catégorie
    if (currentFilters.category && currentFilters.category !== 'Tous') {
        filteredTvShows = filteredTvShows.filter(show => 
            show.category && show.category.includes(currentFilters.category)
        );
    }

    // 2. Filtrer par Année
    if (currentFilters.year) {
        filteredTvShows = filteredTvShows.filter(show => 
            show.year && show.year.toString() === currentFilters.year
        );
    }
    
    // 3. Trier (par défaut: plus récent en premier)
    filteredTvShows.sort((a, b) => (b.year || 0) - (a.year || 0));

    // 4. Rendre les résultats
    renderTvShowGrid(filteredTvShows);
}

/**
 * Rend les séries filtrées dans la grille.
 */
function renderTvShowGrid(shows) {
    tvShowGrid.innerHTML = '';
    if (shows.length === 0) {
        tvShowGrid.innerHTML = '<p style="color: var(--muted); text-align: center; width: 100%; padding: 50px;">Aucune série TV trouvée correspondant à ces critères.</p>';
        return;
    }

    shows.forEach(show => {
        tvShowGrid.appendChild(makeCard(show.key, show));
    });
}


// =========================================================================
// 4. INITIALISATION
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Masquer le contenu avant le chargement
    if (contentWrapper) contentWrapper.style.opacity = 0;
    if (loader) loader.style.display = 'flex';
    
    // Charger les données
    await loadTvShows();
    
    // Rendre les filtres (catégories et années)
    renderFilters();

    // Appliquer les filtres initiaux (afficher tout par défaut)
    applyFilters();
    
    // Événements
    yearFilter.addEventListener('change', (e) => handleFilterChange('year', e.target.value));
    
    // Événement pour voir plus/moins de catégories
    seeMoreCatsBtn.addEventListener('click', function() {
      const allCategories = document.getElementById('allCategories');
      allCategories.classList.toggle('show');
      this.textContent = allCategories.classList.contains('show') ? 'Voir moins de catégories' : 'Voir plus de catégories';
    });

    // Afficher le contenu
    if (contentWrapper) contentWrapper.style.opacity = 1;
    if (loader) loader.style.display = 'none';
});