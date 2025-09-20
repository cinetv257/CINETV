// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB77EmeaPTvtXCH4EL-1E1SgmyW6Yz9lLI",
  authDomain: "cinetv257.firebaseapp.com",
  projectId: "cinetv257",
  storageBucket: "cinetv257.appspot.com",
  messagingSenderId: "402664770835",
  appId: "1:402664770835:web:1adaea98f40ca609645ee6"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Générer un slug pour les URLs
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Création de la carte (film/série)
function makeCard(key, m) {
  const a = document.createElement('a');
  a.href = `watch.html?id=${key}`;
  a.className = 'card';

  const badgeHtml = m.badge ? `<div class="badge">${m.badge}</div>` : '';
  const interpreterHtml = m.interpreter ? `<span class="interpreter"><i class="fas fa-microphone"></i> ${m.interpreter}</span>` : '';
  const yearHtml = m.year ? `<span class="year"><i class="fas fa-calendar-alt"></i> ${m.year}</span>` : '';

  a.innerHTML = `
    <img class="poster" src="${m.imageUrl || ''}" alt="${m.title || ''}" loading="lazy">
    ${badgeHtml}
    <div class="info">
      <div class="title">${m.title || ''}</div>
      <div class="meta">
        ${interpreterHtml}
        ${yearHtml}
      </div>
    </div>
  `;
  return a;
}

// Modals
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Gérer l'ouverture/fermeture des modaux
function setupModalHandlers() {
  document.getElementById('openSearch').onclick = () => openModal('searchModal');
  document.getElementById('bottomSearch').onclick = () => openModal('searchModal');
  document.getElementById('closeSearch').onclick = () => closeModal('searchModal');

  document.getElementById('openContact').onclick = () => openModal('contactModal');
  document.getElementById('footerContact').onclick = () => openModal('contactModal');
  document.getElementById('closeContact').onclick = () => closeModal('contactModal');

  document.getElementById('openAbout').onclick = () => openModal('aboutModal');
  document.getElementById('footerAbout').onclick = () => openModal('aboutModal');
  document.getElementById('closeAbout').onclick = () => closeModal('aboutModal');
}

// Gérer la recherche
function setupSearch(allMovies) {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    searchResults.innerHTML = '';
    if (query.length < 2) return;

    const filtered = allMovies.filter(([, movie]) =>
      movie.title && movie.title.toLowerCase().includes(query)
    );

    filtered.forEach(([key, movie]) => searchResults.appendChild(makeCard(key, movie)));
  });
}

// Gérer le tiroir latéral (drawer)
function setupDrawer() {
  const root = document.documentElement;
  document.getElementById('hamburgerBtn').onclick = () => root.classList.add('drawer-open');
  document.getElementById('drawerClose').onclick = () => root.classList.remove('drawer-open');
  document.getElementById('drawerOverlay').onclick = () => root.classList.remove('drawer-open');
}

// Rendre les catégories dans le tiroir
function renderDrawerCategories(allMovies) {
  const cats = new Set();
  allMovies.forEach(([, m]) => m.category && m.category.forEach(c => cats.add(c)));

  const drawerCats = document.getElementById('drawerCats');
  const allCategories = document.getElementById('allCategories');
  drawerCats.innerHTML = '';
  allCategories.innerHTML = '';

  const sortedCats = Array.from(cats).sort();
  const visibleCats = sortedCats.slice(0, 3);
  const hiddenCats = sortedCats.slice(3);

  visibleCats.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#cat-${slug(c)}"><i class='fas fa-tag'></i> ${c}</a>`;
    drawerCats.appendChild(li);
  });

  hiddenCats.forEach(c => {
    const a = document.createElement('a');
    a.href = `#cat-${slug(c)}`;
    a.className = 'cat-list-item';
    a.innerHTML = `<i class="fas fa-tag"></i> ${c}`;
    allCategories.appendChild(a);
  });

  const seeMoreBtn = document.getElementById('seeMoreCats');
  if (hiddenCats.length > 0) {
    seeMoreBtn.style.display = 'block';
    seeMoreBtn.onclick = () => {
      allCategories.classList.toggle('show');
      seeMoreBtn.textContent = allCategories.classList.contains('show') ? 'Voir moins' : 'Voir plus de catégories';
    };
  } else {
    seeMoreBtn.style.display = 'none';
  }
}

// Charger et afficher les films
async function loadAndRenderMovies() {
  const movieGrid = document.getElementById('movie-grid');
  const sortSelect = document.getElementById('sort-select');

  try {
    const snapshot = await db.ref('movies').orderByChild('dateAdded').once('value');
    let movies = Object.entries(snapshot.val() || {}).filter(([, m]) => m.type !== 'series');
    
    const render = () => {
      const sortBy = sortSelect.value;
      let sortedMovies = [...movies];

      switch (sortBy) {
        case 'recent':
          sortedMovies.sort((a, b) => b[1].dateAdded - a[1].dateAdded);
          break;
        case 'oldest':
          sortedMovies.sort((a, b) => a[1].dateAdded - b[1].dateAdded);
          break;
        case 'az':
          sortedMovies.sort((a, b) => (a[1].title || '').localeCompare(b[1].title || ''));
          break;
        case 'za':
          sortedMovies.sort((a, b) => (b[1].title || '').localeCompare(a[1].title || ''));
          break;
      }

      movieGrid.innerHTML = '';
      sortedMovies.forEach(([key, movie]) => movieGrid.appendChild(makeCard(key, movie)));
    };

    // Premier rendu
    render();
    // Écouter les changements dans le select
    sortSelect.addEventListener('change', render);

    // Initialiser les autres composants
    setupModalHandlers();
    setupSearch(movies);
    setupDrawer();
    renderDrawerCategories(movies);
    
  } catch (error) {
    console.error("Erreur de chargement des films:", error);
    movieGrid.innerHTML = '<div class="error-message">Erreur lors du chargement des films. Veuillez réessayer plus tard.</div>';
  } finally {
    // Cacher le loader
    document.getElementById('loader').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loader').style.display = 'none';
    }, 300);
  }
}

document.addEventListener('DOMContentLoaded', loadAndRenderMovies);
