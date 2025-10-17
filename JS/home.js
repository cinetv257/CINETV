// Configuration Firebase (Doit être la même que dans le HTML original)
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

  // Créer les indicateurs de défilement
  function createScrollIndicator(containerId, itemsCount) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    const dotsCount = Math.min(5, Math.max(3, Math.ceil(itemsCount / 5)));

    for (let i = 0; i < dotsCount; i++) {
      const dot = document.createElement('div');
      dot.className = 'scroll-dot';
      if (i === 0) dot.classList.add('active');
      container.appendChild(dot);
    }

    const scrollContent = container.previousElementSibling;
    if (scrollContent) {
      scrollContent.addEventListener('scroll', () => {
        const scrollPos = scrollContent.scrollLeft;
        const maxScroll = scrollContent.scrollWidth - scrollContent.clientWidth;
        const activeIndex = Math.round((scrollPos / maxScroll) * (dotsCount - 1));
        container.querySelectorAll('.scroll-dot').forEach((dot, index) => {
          dot.classList.toggle('active', index === activeIndex);
        });
      });
    }
  }

  // Gestion du slider héro
  function renderHeroSlider(entries) {
    const sliderContainer = document.getElementById('sliderContainer');
    const sliderIndicator = document.getElementById('sliderIndicator');
    const featuredMovies = entries.slice(0, 5);

    sliderContainer.innerHTML = '';
    sliderIndicator.innerHTML = '';

    featuredMovies.forEach(([key, movie], index) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.style.backgroundImage = `url('${movie.imageUrl}')`;
      slide.innerHTML = `
        <div class="slide-content">
          <h1>${movie.title || ''}</h1>
          <div class="slide-meta">
            ${movie.year ? `<span><i class="fas fa-calendar-alt"></i> ${movie.year}</span>` : ''}
            ${movie.interpreter ? `<span><i class="fas fa-microphone"></i> ${movie.interpreter}</span>` : ''}
            ${movie.badge ? `<span><i class="fas fa-tag"></i> ${movie.badge}</span>` : ''}
            ${movie.category && movie.category.length ? `<span><i class="fas fa-tag"></i> ${movie.category.join(' • ')}</span>` : ''}
          </div>
          <a class="btn btn-primary" href="watch.html?id=${key}"><i class="fas fa-play"></i> Regarder</a>
        </div>
      `;
      sliderContainer.appendChild(slide);

      const dot = document.createElement('div');
      dot.className = 'slider-dot';
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(index));
      sliderIndicator.appendChild(dot);
    });

    let currentSlide = 0;
    const totalSlides = featuredMovies.length;

    function goToSlide(index) {
      currentSlide = (index + totalSlides) % totalSlides;
      sliderContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
      document.querySelectorAll('.slider-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
      });
    }

    let slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);

    sliderContainer.addEventListener('mouseenter', () => clearInterval(slideInterval));
    sliderContainer.addEventListener('mouseleave', () => {
      slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    });
  }

  // Rendre nouveautés (2025)
  function renderNouveautes(entries) {
    const wrap = document.getElementById('nouveautesContent');
    wrap.innerHTML = '';
    const nouveautes = entries.filter(([, m]) => +m.year === 2025);
    nouveautes.forEach(([k, m]) => wrap.appendChild(makeCard(k, m)));
    createScrollIndicator('nouveautesIndicator', nouveautes.length);
  }

  // Rendre les catégories
  function renderCategories(entries) {
    const cats = new Set();
    entries.forEach(([, m]) => m.category && m.category.forEach(c => cats.add(c)));

    const drawerCats = document.getElementById('drawerCats');
    drawerCats.innerHTML = '';
    const allCategories = document.getElementById('allCategories');
    allCategories.innerHTML = '';
    const sec = document.getElementById('sections');
    sec.innerHTML = '';

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
        seeMoreBtn.textContent = allCategories.classList.contains('show') ? 'Voir moins' : 'Voir plus';
      };
    } else {
      seeMoreBtn.style.display = 'none';
    }

    sortedCats.forEach(c => {
      const section = document.createElement('section');
      section.className = 'section';
      section.id = `cat-${slug(c)}`;
      section.innerHTML = `
        <h2><i class="fas fa-tag"></i> ${c}</h2>
        <div class="scroll-container">
          <div class="scroll-content" id="cat-${slug(c)}-content"></div>
          <div class="scroll-indicator" id="cat-${slug(c)}-indicator"></div>
        </div>
      `;
      const grid = section.querySelector(`#cat-${slug(c)}-content`);
      const catEntries = entries.filter(([, m]) => m.category && m.category.includes(c));
      catEntries.forEach(([k, m]) => grid.appendChild(makeCard(k, m)));
      createScrollIndicator(`cat-${slug(c)}-indicator`, catEntries.length);
      sec.appendChild(section);
    });
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

  // Recherche
  function openSearch() { openModal('searchModal'); document.getElementById('searchInput').focus(); }
  function closeSearch() {
    closeModal('searchModal');
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchInput').value = '';
  }

  // Contact & À propos
  function openContact() { openModal('contactModal'); }
  function openAbout() { openModal('aboutModal'); }
  function closeContact() { closeModal('contactModal'); }
  function closeAbout() { closeModal('aboutModal'); }

  // Charger depuis localStorage ou Firebase
  async function loadMovies() {
    const cache = localStorage.getItem('cinetv_movies');
    const cacheTime = localStorage.getItem('cinetv_cache_time');
    const now = Date.now();
    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

    if (cache && cacheTime && now - parseInt(cacheTime) < CACHE_DURATION) {
      console.log('Données chargées depuis le cache local');
      return JSON.parse(cache);
    }

    console.log('Chargement depuis Firebase...');
    try {
      const snapshot = await db.ref('movies').once('value');
      const data = snapshot.val() || {};
      const entries = Object.entries(data);
      // Sauvegarder dans localStorage
      localStorage.setItem('cinetv_movies', JSON.stringify(entries));
      localStorage.setItem('cinetv_cache_time', now.toString());
      return entries;
    } catch (error) {
      console.error("Erreur de chargement Firebase:", error);
      // En cas d'erreur, utiliser le cache même s'il est expiré
      return cache ? JSON.parse(cache) : [];
    }
  }

  // NOUVELLE FONCTION: Charger et afficher la publicité
  async function loadAd() {
    const adScreen = document.getElementById('adsScreen');
    const adVideo = document.getElementById('adVideoPlayer');
    const adLink = document.getElementById('adRedirectLink');

    try {
      // Assumer que le nœud 'ads' dans Firebase Realtime Database contient l'URL de la vidéo et l'URL de redirection.
      // Exemple de structure dans Firebase:
      // ads: { videoUrl: "url_video_direct", redirectUrl: "url_de_redirection" }
      const snapshot = await db.ref('ads').once('value');
      const adData = snapshot.val();

      if (adData && adData.videoUrl && adData.redirectUrl) {
        adVideo.src = adData.videoUrl;
        adLink.href = adData.redirectUrl;
        adScreen.style.display = 'block';

        // Tenter de lire la vidéo. Si elle est bloquée, elle restera silencieuse (muted).
        adVideo.play().catch(error => {
          console.log("Lecture auto bloquée, assurez-vous que la vidéo est muted:", error);
        });

      } else {
        adScreen.style.display = 'none';
        console.warn("Aucune donnée d'annonce valide trouvée dans Firebase.");
      }
    } catch (error) {
      adScreen.style.display = 'none';
      console.error("Erreur de chargement de l'annonce Firebase:", error);
    }
  }


  // Initialisation
  document.addEventListener('DOMContentLoaded', async () => {
    // Gérer les événements
    document.getElementById('openSearch').onclick = openSearch;
    document.getElementById('bottomSearch').onclick = openSearch;
    document.getElementById('closeSearch').onclick = closeSearch;

    document.getElementById('openContact').onclick = openContact;
    document.getElementById('footerContact').onclick = openContact;
    document.getElementById('closeContact').onclick = closeContact;

    document.getElementById('openAbout').onclick = openAbout;
    document.getElementById('footerAbout').onclick = openAbout;
    document.getElementById('closeAbout').onclick = closeAbout;

    // Recherche
    document.getElementById('searchInput').addEventListener('input', function () {
      const q = this.value.toLowerCase();
      const resWrap = document.getElementById('searchResults');
      resWrap.innerHTML = '';
      if (!q) return;

      const cached = localStorage.getItem('cinetv_movies');
      const entries = cached ? JSON.parse(cached) : [];

      const results = entries.filter(([, m]) => m.title && m.title.toLowerCase().includes(q));
      results.forEach(([k, m]) => resWrap.appendChild(makeCard(k, m)));
    });

    // Drawer
    const root = document.documentElement;
    document.getElementById('hamburgerBtn').onclick = () => root.classList.add('drawer-open');
    document.getElementById('drawerClose').onclick = () => root.classList.remove('drawer-open');
    document.getElementById('drawerOverlay').onclick = () => root.classList.remove('drawer-open');

    // Charger les données et la publicité
    try {
      await loadAd(); // Charger la publicité en premier
      const entries = await loadMovies();
      if (entries.length > 0) {
        renderHeroSlider(entries);
        renderNouveautes(entries);
        renderCategories(entries);
      } else {
        console.warn("Aucune donnée disponible.");
      }
    } catch (error) {
      console.error("Échec du chargement des données ou de la publicité:", error);
    } finally {
      // Cacher le loader
      document.getElementById('loader').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
      }, 300);
    }
  });