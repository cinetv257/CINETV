/* =========================================================
   Safi Ai — assistant bTicket (bouton flottant + chat)
   Ce fichier est utilisé par TOUTES les pages du site.
   La conversation est partagée entre les pages (même appareil).
   ========================================================= */
(function () {
  'use strict';
  if (window.__safiAi) return;
  window.__safiAi = true;

  // ---------- Styles ----------
  var CSS = `/* =========================================================
   15. ASSISTANT IA FLOTTANT — Safi Ai
   ========================================================= */
.bt-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 950;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--or) 0%, #b8912a 100%);
  color: var(--noir);
  display: grid;
  place-items: center;
  box-shadow: 0 12px 28px -8px rgba(212,175,55,.65),
              0 4px 12px -4px rgba(0,0,0,.5);
  transition: transform .3s var(--ease), box-shadow .3s var(--ease);
  border: none;
  cursor: pointer;
}
.bt-fab:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 18px 36px -10px rgba(212,175,55,.85),
              0 6px 16px -6px rgba(0,0,0,.6);
}
.bt-fab:active { transform: translateY(-1px) scale(.98); }
.bt-fab svg { width: 26px; height: 26px; }
.bt-fab__badge {
  position: absolute;
  top: -4px; right: -4px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid var(--noir);
  box-shadow: 0 0 8px rgba(16,185,129,.9);
}
.bt-fab__icon-close { display: none; }
.bt-fab.open .bt-fab__icon-chat { display: none; }
.bt-fab.open .bt-fab__icon-close { display: block; }
.bt-fab.open {
  transform: rotate(90deg);
}

.bt-chat {
  position: fixed;
  right: 24px;
  bottom: 100px;
  z-index: 940;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 560px;
  max-height: calc(100vh - 140px);
  background: var(--anthracite);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 30px 60px -20px rgba(0,0,0,.85),
              0 0 0 1px rgba(255,255,255,.03) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px) scale(.96);
  transform-origin: bottom right;
  transition: opacity .35s var(--ease), visibility .35s var(--ease), transform .35s var(--ease);
}
.bt-chat.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.bt-chat__header {
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(212,175,55,.12), rgba(212,175,55,.02));
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  gap: 12px;
}
.bt-chat__avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--or), #b8912a);
  display: grid; place-items: center;
  color: var(--noir);
  flex-shrink: 0;
}
.bt-chat__avatar svg {
  width: 22px; height: 22px;
}
.bt-chat__title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bt-chat__title strong {
  font-size: .95rem;
  color: var(--blanc);
  font-weight: 600;
}
.bt-chat__status {
  font-size: .72rem;
  color: var(--texte-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.bt-chat__status i {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}
.bt-chat__close {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--line-soft);
  color: var(--texte-muted);
  display: grid; place-items: center;
  transition: all .25s var(--ease);
}
.bt-chat__close:hover {
  background: rgba(255,255,255,.05);
  color: var(--ivoire);
}
.bt-chat__close svg { width: 14px; height: 14px; }

.bt-chat__body {
  flex: 1;
  padding: 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}
.bt-chat__body::-webkit-scrollbar { width: 6px; }
.bt-chat__body::-webkit-scrollbar-thumb { background: var(--anthracite-2); border-radius: 6px; }

.bt-msg {
  max-width: 85%;
  padding: 11px 15px;
  border-radius: 14px;
  font-size: .9rem;
  line-height: 1.5;
  word-wrap: break-word;
  animation: btFade .3s var(--ease);
}
.bt-msg--ai {
  align-self: flex-start;
  background: rgba(255,255,255,.05);
  color: var(--ivoire);
  border-bottom-left-radius: 4px;
}
/* Mise en forme des réponses de l'IA (gras, italique, listes, liens) */
.bt-msg--ai p { margin: 0 0 .6em; }
.bt-msg--ai p:last-child, .bt-msg--ai ul:last-child, .bt-msg--ai ol:last-child { margin-bottom: 0; }
.bt-msg--ai ul, .bt-msg--ai ol { margin: 0 0 .6em; padding-left: 1.3em; }
.bt-msg--ai li { margin-bottom: .25em; }
.bt-msg--ai strong { font-weight: 700; color: var(--blanc); }
.bt-msg--ai em { font-style: italic; }
.bt-msg--ai code { background: rgba(255,255,255,.1); padding: 1px 6px; border-radius: 5px; font-size: .85em; }
.bt-msg--ai a { color: var(--or); text-decoration: underline; word-break: break-all; }

.bt-msg--user {
  align-self: flex-end;
  background: var(--or);
  color: var(--noir);
  border-bottom-right-radius: 4px;
  font-weight: 500;
}
.bt-msg--error {
  align-self: center;
  background: rgba(220,38,38,.15);
  color: #fca5a5;
  font-size: .82rem;
  text-align: center;
  border: 1px solid rgba(220,38,38,.3);
}

.bt-typing {
  align-self: flex-start;
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: rgba(255,255,255,.05);
  border-radius: 14px;
  border-bottom-left-radius: 4px;
}
.bt-typing span {
  width: 6px; height: 6px;
  background: var(--texte-muted);
  border-radius: 50%;
  animation: btBounce 1.4s infinite ease-in-out both;
}
.bt-typing span:nth-child(1) { animation-delay: -0.32s; }
.bt-typing span:nth-child(2) { animation-delay: -0.16s; }

.bt-chat__footer {
  padding: 14px;
  border-top: 1px solid var(--line-soft);
  background: rgba(0,0,0,.15);
}
.bt-chat__form {
  display: flex;
  gap: 8px;
  align-items: center;
}
.bt-chat__input {
  flex: 1;
  padding: 11px 15px;
  border-radius: 100px;
  border: 1px solid var(--line-soft);
  background: var(--noir-soft);
  color: var(--ivoire);
  font-family: var(--font);
  font-size: .9rem;
  outline: none;
  transition: border-color .25s var(--ease);
}
.bt-chat__input:focus { border-color: var(--or); }
.bt-chat__input::placeholder { color: var(--texte-faint); }
.bt-chat__send {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--or);
  color: var(--noir);
  display: grid; place-items: center;
  transition: background .25s var(--ease), transform .15s var(--ease);
  flex-shrink: 0;
}
.bt-chat__send:hover:not(:disabled) { background: #e0bb47; }
.bt-chat__send:active:not(:disabled) { transform: scale(.92); }
.bt-chat__send:disabled {
  background: var(--anthracite-2);
  color: var(--texte-faint);
  cursor: not-allowed;
}
.bt-chat__send svg { width: 16px; height: 16px; }

@keyframes btFade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes btBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@media (max-width: 480px) {
  .bt-fab { right: 16px; bottom: 16px; width: 56px; height: 56px; }
  .bt-chat {
    right: 16px;
    bottom: 84px;
    width: calc(100vw - 32px);
    height: calc(100vh - 120px);
    max-height: none;
  }
}
`;

  // ---------- Bouton + fenêtre de chat ----------
  var HTML = `<button class="bt-fab" id="btFab" aria-label="Ouvrir l'assistant Safi Ai">
  <span class="bt-fab__badge"></span>
  <svg class="bt-fab__icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
  <svg class="bt-fab__icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
</button>

<aside class="bt-chat" id="btChat" aria-hidden="true">
  <div class="bt-chat__header">
    <div class="bt-chat__avatar">
      <!-- Tête de robot corrigée et propre -->
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="8" width="16" height="12" rx="3"/>
        <path d="M12 8V4M10 4h4"/>
        <circle cx="9" cy="13" r="1.5"/>
        <circle cx="15" cy="13" r="1.5"/>
        <path d="M9 17h6"/>
        <path d="M2 13h2M20 13h2"/>
      </svg>
    </div>
    <div class="bt-chat__title">
      <strong>Safi Ai</strong>
      <span class="bt-chat__status"><i></i> En ligne</span>
    </div>
    <button class="bt-chat__close" id="btChatClear" aria-label="Nouvelle conversation" title="Nouvelle conversation" style="margin-right:8px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>
      </svg>
    </button>
    <button class="bt-chat__close" id="btChatClose" aria-label="Fermer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>

  <div class="bt-chat__body" id="btChatBody">
    <div class="bt-msg bt-msg--ai">
      Bonjour 👋 Je suis Safi Ai, votre assistant bTicket. Comment puis-je vous aider aujourd'hui ?
    </div>
  </div>

  <div class="bt-chat__footer">
    <div class="bt-chat__form" id="btChatForm">
      <input
        type="text"
        class="bt-chat__input"
        id="btChatInput"
        placeholder="Posez votre question..."
        autocomplete="off">
      <button type="button" class="bt-chat__send" id="btChatSend" aria-label="Envoyer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  </div>
</aside>`;

  // ---------- Réglages ----------
  // Le fichier d'informations (safi-infos.txt) est cherché à côté de ce script
  var URL_INFOS = (function () {
    try { return new URL('safi-infos.txt', document.currentScript ? document.currentScript.src : location.href).href; }
    catch (e) { return 'safi-infos.txt'; }
  })();
  var VERSION_FIREBASE = '13.0.0';
  var firebaseConfig = {
    apiKey: "AIzaSyBcf1eysXtdI5vOgI02yd8sCFs3wGWJ90A",
    authDomain: "bticket-burundi.firebaseapp.com",
    databaseURL: "https://bticket-burundi-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "bticket-burundi",
    storageBucket: "bticket-burundi.firebasestorage.app",
    messagingSenderId: "407762427157",
    appId: "1:407762427157:web:1e0f2ef5458fdbaa575d1c",
    measurementId: "G-J60JBTZ647"
  };
  var CLE_SITE_RECAPTCHA = '6LfCFfEtAAAAAFhBn3JVI6cZ8qIp7tOafOjYkWDC';
  // Modèles essayés dans l'ordre : si l'un est refusé, on passe au suivant
  var MODELES = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

  var PAGES = {
    'index': 'Accueil', 'application': 'Application', 'organisateurs': 'Organisateurs',
    'agents': 'Agents', 'tarifs': 'Tarifs', 'a-propos': 'À propos', 'telecharger': 'Télécharger'
  };
  var CONSIGNE_BASE = `Tu es Safi Ai, l'assistant virtuel officiel de bTicket, la plateforme africaine de billetterie numérique.
Tu réponds toujours en français, de façon chaleureuse, professionnelle et concise.
Tu aides les utilisateurs avec :
- L'achat et la validation de billets
- Les questions sur les événements
- Les informations sur les organisateurs et les agents
- Les tarifs et les fonctionnalités de l'application
Si tu ne connais pas une information précise, invite l'utilisateur à consulter l'application ou à contacter le support.
Ne donne jamais d'informations inventées. Reste toujours dans le contexte de bTicket.
Le site bTicket comporte ces pages : Accueil (index.html), Application (application.html), Organisateurs (organisateurs.html), Agents (agents.html), Tarifs (tarifs.html), À propos (a-propos.html) et Télécharger (telecharger.html).
Quand une de ces pages peut aider l'utilisateur, propose-lui le lien sous la forme [Tarifs](tarifs.html), avec exactement ce nom de fichier.`;

  var CLE_STOCKAGE = 'bticket_safi_chat_v1';   // conversation (partagée entre les pages)
  var CLE_OUVERT = 'bticket_safi_ouvert';      // chat ouvert ou fermé (gardé d'une page à l'autre)
  var ACCUEIL = "Bonjour 👋 Je suis Safi Ai, votre assistant bTicket. Comment puis-je vous aider aujourd'hui ?";

  function nomPage() {
    var nom = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
    return PAGES[nom] ? nom : null;
  }

  // ---------- Mise en forme du texte de l'IA ----------
  function echapper(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function enLigne(t) {
    return t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // lien vers une page du site (ex : tarifs.html)
      .replace(/\[([^\]]+)\]\(((?:index|application|organisateurs|agents|tarifs|a-propos|telecharger)\.html(?:#[\w-]+)?)\)/g, '<a href="$2">$1</a>')
      // lien externe
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>');
  }
  function formaterTexte(brut) {
    var lignes = echapper(brut).split('\n');
    var html = '';
    var liste = null;
    function fermer() { if (liste) { html += '</' + liste + '>'; liste = null; } }
    lignes.forEach(function (l) {
      var ligne = l.trim();
      var m;
      if (!ligne) { fermer(); return; }
      if ((m = ligne.match(/^[*\-•]\s+(.*)$/))) {
        if (liste !== 'ul') { fermer(); html += '<ul>'; liste = 'ul'; }
        html += '<li>' + enLigne(m[1]) + '</li>';
      } else if ((m = ligne.match(/^\d+[.)]\s+(.*)$/))) {
        if (liste !== 'ol') { fermer(); html += '<ol>'; liste = 'ol'; }
        html += '<li>' + enLigne(m[1]) + '</li>';
      } else if ((m = ligne.match(/^#{1,6}\s+(.*)$/))) {
        fermer();
        html += '<p><strong>' + enLigne(m[1]) + '</strong></p>';
      } else {
        fermer();
        html += '<p>' + enLigne(ligne) + '</p>';
      }
    });
    fermer();
    return html;
  }

  // ---------- Démarrage ----------
  function demarrer() {
    // Styles + HTML injectés dans la page
    var style = document.createElement('style');
    style.id = 'btSafiStyles';
    style.textContent = CSS;
    document.head.appendChild(style);

    var conteneur = document.createElement('div');
    conteneur.innerHTML = HTML;
    while (conteneur.firstChild) document.body.appendChild(conteneur.firstChild);

    var fab = document.getElementById('btFab');
    var chat = document.getElementById('btChat');
    var chatClose = document.getElementById('btChatClose');
    var chatClear = document.getElementById('btChatClear');
    var chatBody = document.getElementById('btChatBody');
    var chatInput = document.getElementById('btChatInput');
    var chatSend = document.getElementById('btChatSend');
    if (!fab || !chat || !chatBody || !chatInput || !chatSend) return;

    var chatHistory = [];          // contexte envoyé à l'IA
    var messagesSauvegardes = [];  // ce qui est affiché et gardé sur l'appareil

    // ----- Ouvrir / fermer (l'état est gardé d'une page à l'autre) -----
    function memoriserOuvert(v) {
      try { sessionStorage.setItem(CLE_OUVERT, v ? '1' : '0'); } catch (e) {}
    }
    function ouvrir(avecFocus) {
      chat.classList.add('open');
      chat.setAttribute('aria-hidden', 'false');
      fab.classList.add('open');
      memoriserOuvert(true);
      chargerIA().catch(function () {}); // prépare l'IA en arrière-plan
      if (avecFocus) setTimeout(function () { chatInput.focus(); }, 300);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
    function fermer() {
      chat.classList.remove('open');
      chat.setAttribute('aria-hidden', 'true');
      fab.classList.remove('open');
      memoriserOuvert(false);
    }
    fab.addEventListener('click', function () {
      if (chat.classList.contains('open')) fermer(); else ouvrir(true);
    });
    chatClose.addEventListener('click', fermer);

    // ----- Messages -----
    function creerBulle(text, type) {
      var div = document.createElement('div');
      div.classList.add('bt-msg', 'bt-msg--' + type);
      if (type === 'ai') div.innerHTML = formaterTexte(text);
      else div.textContent = text;
      return div;
    }
    function ajouterMessage(text, type) {
      var div = creerBulle(text, type);
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
      return div;
    }
    function afficherTyping() {
      var div = document.createElement('div');
      div.classList.add('bt-typing');
      div.id = 'btTyping';
      div.innerHTML = '<span></span><span></span><span></span>';
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
    function retirerTyping() {
      var t = document.getElementById('btTyping');
      if (t) t.remove();
    }

    // ----- Mémoire de la conversation (partagée entre les pages) -----
    function sauvegarder() {
      try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(messagesSauvegardes.slice(-40))); } catch (e) {}
    }
    function charger() {
      messagesSauvegardes = [];
      try {
        var brut = localStorage.getItem(CLE_STOCKAGE);
        var liste = brut ? JSON.parse(brut) : [];
        if (Array.isArray(liste)) messagesSauvegardes = liste.filter(function (m) {
          return m && typeof m.text === 'string' && (m.type === 'user' || m.type === 'ai');
        });
      } catch (e) { messagesSauvegardes = []; }
      chatHistory = messagesSauvegardes.slice(-20).map(function (m) {
        return { role: m.type === 'user' ? 'user' : 'model', parts: [{ text: m.text }] };
      });
    }
    function afficherConversation() {
      chatBody.innerHTML = '';
      chatBody.appendChild(creerBulle(ACCUEIL, 'ai'));
      messagesSauvegardes.forEach(function (m) { chatBody.appendChild(creerBulle(m.text, m.type)); });
      chatBody.scrollTop = chatBody.scrollHeight;
    }
    function nouvelleConversation() {
      messagesSauvegardes = [];
      chatHistory = [];
      try { localStorage.removeItem(CLE_STOCKAGE); } catch (e) {}
      afficherConversation();
    }
    if (chatClear) chatClear.addEventListener('click', nouvelleConversation);

    // Une autre page / un autre onglet a modifié la conversation : on se met à jour
    window.addEventListener('storage', function (e) {
      if (e.key === CLE_STOCKAGE || e.key === null) { charger(); afficherConversation(); }
    });

    // ----- Informations de bTicket (fichier safi-infos.txt) -----
    async function lireInfos() {
      try {
        var rep = await fetch(URL_INFOS, { cache: 'no-cache' });
        if (!rep.ok) throw new Error('HTTP ' + rep.status);
        var texte = await rep.text();
        texte = texte.split('\n').filter(function (l) { return l.trim().indexOf('//') !== 0; }).join('\n').trim();
        if (texte) console.info('Safi Ai : informations chargées (' + texte.length + ' caractères)');
        return texte;
      } catch (e) {
        console.warn('Safi Ai : safi-infos.txt introuvable, réponses limitées aux consignes de base.', e);
        return '';
      }
    }

    // ----- Chargement de l'IA (seulement quand on en a besoin) -----
    var promesseIA = null;
    function chargerIA() {
      if (promesseIA) return promesseIA;
      promesseIA = (async function () {
        var base = 'https://www.gstatic.com/firebasejs/' + VERSION_FIREBASE + '/';
        var mods = await Promise.all([
          import(base + 'firebase-app.js'),
          import(base + 'firebase-ai.js'),
          import(base + 'firebase-app-check.js')
        ]);
        var appMod = mods[0], aiMod = mods[1], checkMod = mods[2];
        var app = appMod.initializeApp(firebaseConfig);
        checkMod.initializeAppCheck(app, {
          provider: new checkMod.ReCaptchaEnterpriseProvider(CLE_SITE_RECAPTCHA),
          isTokenAutoRefreshEnabled: true
        });
        var ai = aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() });
        var page = nomPage();
        var infos = await lireInfos();
        var consigne = CONSIGNE_BASE
          + (page ? "\nLe visiteur se trouve actuellement sur la page « " + PAGES[page] + " » du site." : "")
          + (infos ? "\n\n===== INFORMATIONS OFFICIELLES DE BTICKET =====\n" + infos : "");
        return MODELES.map(function (nom) {
          return aiMod.getGenerativeModel(ai, { model: nom, systemInstruction: consigne });
        });
      })();
      promesseIA.catch(function () { promesseIA = null; });
      return promesseIA;
    }

    // ----- Envoi d'un message -----
    async function envoyer() {
      var text = chatInput.value.trim();
      if (!text) return;

      ajouterMessage(text, 'user');
      chatInput.value = '';
      chatSend.disabled = true;
      afficherTyping();

      try {
        var modeles = await chargerIA();
        var reponse = null;
        var derniereErreur = null;
        for (var i = 0; i < modeles.length; i++) {
          try {
            var result = await modeles[i].generateContent({
              contents: chatHistory.concat([{ role: 'user', parts: [{ text: text }] }])
            });
            reponse = result.response.text();
            break;
          } catch (e) {
            console.error('Modèle ' + MODELES[i] + ' en échec :', e);
            derniereErreur = e;
          }
        }
        if (reponse === null) throw derniereErreur;

        retirerTyping();
        ajouterMessage(reponse, 'ai');

        // On relit la mémoire au cas où une autre page l'aurait modifiée entre-temps
        charger();
        messagesSauvegardes.push({ type: 'user', text: text }, { type: 'ai', text: reponse });
        chatHistory.push({ role: 'user', parts: [{ text: text }] }, { role: 'model', parts: [{ text: reponse }] });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
        sauvegarder();
      } catch (error) {
        console.error('Erreur Safi Ai :', error);
        retirerTyping();
        ajouterMessage('Erreur technique : ' + ((error && error.message) || 'Problème de connexion.'), 'error');
      } finally {
        chatSend.disabled = false;
        chatInput.focus();
      }
    }
    chatSend.addEventListener('click', envoyer);
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); envoyer(); }
    });

    // ----- Au chargement de la page -----
    charger();
    afficherConversation();
    var etaitOuvert = false;
    try { etaitOuvert = sessionStorage.getItem(CLE_OUVERT) === '1'; } catch (e) {}
    if (etaitOuvert) ouvrir(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
