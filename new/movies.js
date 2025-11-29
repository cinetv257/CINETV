/**
 * * Fichier : movies.js
 * Rôle : Logique spécifique à la page des films (Chargement de données, Filtrage, Affichage)
 * Page concernée : movies.html
 * */

// Importation des références Firebase
import { publicDB } from './firebase-config.js';
import { debounce } from './app-common.js'; // Importation de la fonction debounce

// Références DOM
const movieGrid = document.getElementById('movieGrid');
const yearFilter = document.getElementById('yearFilter');
const visibleCategoriesContainer = document.getElementById('visibleCategories');
const allCategoriesContainer = document.getElementById('allCategories');
const seeMoreCatsBtn = document.getElementById('seeMoreCats');
const currentCategoryTitle = document.getElementById('currentCategoryTitle');
const loader = document.getElementById('loader');
const contentWrapper = document.getElementById('contentWrapper');

let allMovies = []; // Stocke tous les films pour le filtrage local
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
 * Crée la carte de film pour la grille.
 */
function makeCard(key, content) {
    const card = document.createElement('a');
    card.href = `watch.html?id=${key}`;
    card.className = 'card'; // Utilise la classe CSS globale 'card'

    card.innerHTML = `
        <div class="card-image-wrapper">
            <img src="${content.image}" alt="${content.title}">
        </div>
        <div class="card-title">${content.title}</div>
        <div class="card-meta">${content.year || ''} - ${content.category || ''}</div>
    `;
    return card;
}

// =========================================================================
// 2. CHARGEMENT ET PRÉPARATION DES DONNÉES
// =========================================================================

/**
 * Charge tous les films depuis la base de données publique.
 */
async function loadMovies() {
    if (loader) loader.style.display = 'flex';
    
    try {
        const snapshot = await publicDB.ref('movies')
            .orderByChild('type')
            .equalTo('movie') // Filtre côté Firebase pour n'obtenir que les films
            .once('value');
            
        const contentObject = snapshot.val();
        
        if (!contentObject) {
            allMovies = [];
            return;
        }

        allMovies = Object.entries(contentObject).map(([key, content]) => ({ key, ...content }));
        
        // Collecter les catégories et les années pour les filtres
        availableCategories.clear();
        availableYears.clear();
        allMovies.forEach(movie => {
            if (movie.category) {
                movie.category.split(',').map(c => c.trim()).forEach(c => availableCategories.add(c));
            }
            if (movie.year) {
                availableYears.add(movie.year.toString());
            }
        });

    } catch (error) {
        console.error("Erreur lors du chargement des films:", error);
        allMovies = [];
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
            ? 'Tous les films' 
            : `Films : ${currentFilters.category}`;
            
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
 * Applique tous les filtres actifs et rend la grille de films.
 */
function applyFilters() {
    let filteredMovies = allMovies;

    // 1. Filtrer par Catégorie
    if (currentFilters.category && currentFilters.category !== 'Tous') {
        filteredMovies = filteredMovies.filter(movie => 
            movie.category && movie.category.includes(currentFilters.category)
        );
    }

    // 2. Filtrer par Année
    if (currentFilters.year) {
        filteredMovies = filteredMovies.filter(movie => 
            movie.year && movie.year.toString() === currentFilters.year
        );
    }
    
    // 3. Trier (par défaut: plus récent en premier)
    filteredMovies.sort((a, b) => (b.year || 0) - (a.year || 0));

    // 4. Rendre les résultats
    renderMovieGrid(filteredMovies);
}

/**
 * Rend les films filtrés dans la grille.
 */
function renderMovieGrid(movies) {
    movieGrid.innerHTML = '';
    if (movies.length === 0) {
        movieGrid.innerHTML = '<p style="color: var(--muted); text-align: center; width: 100%; padding: 50px;">Aucun film trouvé correspondant à ces critères.</p>';
        return;
    }

    movies.forEach(movie => {
        movieGrid.appendChild(makeCard(movie.key, movie));
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
    await loadMovies();
    
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