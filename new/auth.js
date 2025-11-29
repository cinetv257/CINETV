// auth.js
// Système d'interface d'authentification pour CINETV

class AuthUI {
    constructor() {
        this.authManager = authManager;
        this.initAuthModals();
        this.initAuthButtons();
        this.checkExistingAuth();
    }

    // Vérifier si l'utilisateur est déjà connecté
    checkExistingAuth() {
        const isLoggedIn = localStorage.getItem('cinetv_user_loggedin');
        if (isLoggedIn === 'true') {
            console.log('🔄 Session existante détectée');
        }
    }

    // Initialiser les modales d'authentification
    initAuthModals() {
        this.createAuthModal();
        this.createProfileModal();
    }

    // Initialiser les boutons d'authentification
    initAuthButtons() {
        document.addEventListener('DOMContentLoaded', () => {
            // Bouton de connexion dans la navbar
            this.setupNavbarAuth();
            
            // Bouton de profil utilisateur
            this.setupProfileButton();
            
            // Écouteurs pour les modales
            this.setupModalListeners();
        });
    }

    // Configuration de l'authentification dans la navbar
    setupNavbarAuth() {
        const navbarRight = document.querySelector('.navbar-right');
        if (!navbarRight) return;

        // Vérifier si le bouton d'auth existe déjà
        if (!document.getElementById('authButton')) {
            const authButton = document.createElement('button');
            authButton.id = 'authButton';
            authButton.className = 'auth-btn login-btn';
            authButton.innerHTML = '<i class="fas fa-user"></i> Connexion';
            authButton.style.cssText = `
                background: rgba(106, 103, 255, 0.1);
                border: 1px solid rgba(106, 103, 255, 0.3);
                color: var(--brand);
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: var(--transition);
                font-weight: 600;
            `;

            authButton.addEventListener('mouseenter', () => {
                authButton.style.background = 'rgba(106, 103, 255, 0.2)';
                authButton.style.transform = 'translateY(-2px)';
            });

            authButton.addEventListener('mouseleave', () => {
                authButton.style.background = 'rgba(106, 103, 255, 0.1)';
                authButton.style.transform = 'translateY(0)';
            });

            authButton.addEventListener('click', () => {
                this.showAuthModal();
            });

            // Insérer avant le bouton hamburger
            const hamburgerBtn = document.querySelector('.hamburger');
            if (hamburgerBtn) {
                navbarRight.insertBefore(authButton, hamburgerBtn);
            } else {
                navbarRight.appendChild(authButton);
            }
        }
    }

    // Configuration du bouton de profil
    setupProfileButton() {
        // Sera mis à jour dynamiquement par authManager
    }

    // Créer la modale d'authentification
    createAuthModal() {
        if (document.getElementById('authModal')) return;

        const modalHTML = `
        <div class="modal" id="authModal" style="display: none;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3 class="modal-title" id="authModalTitle">
                        <i class="fas fa-sign-in-alt"></i> Connexion
                    </h3>
                    <button class="close" id="closeAuthModal">&times;</button>
                </div>
                
                <div id="authMessage" class="auth-message hidden"></div>
                
                <!-- Formulaire de Connexion -->
                <form id="loginForm" class="auth-form">
                    <div class="form-group">
                        <label for="loginEmail">Adresse Email</label>
                        <input type="email" id="loginEmail" class="form-control" 
                               placeholder="votre@email.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="loginPassword">Mot de passe</label>
                        <input type="password" id="loginPassword" class="form-control" 
                               placeholder="Votre mot de passe" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" id="loginButton" style="width: 100%;">
                        <i class="fas fa-sign-in-alt"></i> Se connecter
                    </button>
                    
                    <div class="auth-footer">
                        <a href="#" id="forgotPassword">Mot de passe oublié ?</a>
                        <span> | </span>
                        <a href="#" id="switchToRegister">Créer un compte</a>
                    </div>
                </form>
                
                <!-- Formulaire d'Inscription -->
                <form id="registerForm" class="auth-form hidden">
                    <div class="form-group">
                        <label for="registerName">Nom complet</label>
                        <input type="text" id="registerName" class="form-control" 
                               placeholder="Votre nom" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="registerEmail">Adresse Email</label>
                        <input type="email" id="registerEmail" class="form-control" 
                               placeholder="votre@email.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="registerPassword">Mot de passe</label>
                        <input type="password" id="registerPassword" class="form-control" 
                               placeholder="Minimum 6 caractères" required minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <label for="registerConfirmPassword">Confirmer le mot de passe</label>
                        <input type="password" id="registerConfirmPassword" class="form-control" 
                               placeholder="Confirmez votre mot de passe" required minlength="6">
                    </div>
                    
                    <div class="terms-group">
                        <input type="checkbox" id="acceptTerms" class="terms-checkbox" required>
                        <label for="acceptTerms" class="terms-label">
                            J'accepte les <a href="privacy.html" target="_blank">Conditions d'utilisation</a> 
                            et la <a href="privacy.html" target="_blank">Politique de confidentialité</a>
                        </label>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" id="registerButton" style="width: 100%;">
                        <i class="fas fa-user-plus"></i> Créer mon compte
                    </button>
                    
                    <div class="auth-footer">
                        <a href="#" id="switchToLogin">Déjà un compte ? Se connecter</a>
                    </div>
                </form>
                
                <!-- Séparateur -->
                <div class="auth-separator">
                    <span>OU</span>
                </div>
                
                <!-- Connexion rapide -->
                <div class="quick-auth">
                    <button class="btn btn-google" id="googleAuth">
                        <i class="fab fa-google"></i> Continuer avec Google
                    </button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.injectAuthStyles();
    }

    // Injecter les styles CSS pour l'authentification
    injectAuthStyles() {
        if (document.getElementById('authStyles')) return;

        const styles = `
        <style id="authStyles">
            .auth-form {
                animation: fadeIn 0.3s ease;
            }
            
            .auth-form.hidden {
                display: none;
            }
            
            .auth-message {
                padding: 12px 16px;
                margin: 10px 0;
                border-radius: 8px;
                font-size: 0.9rem;
                font-weight: 500;
                text-align: center;
                border: 1px solid transparent;
            }
            
            .auth-message.success {
                background: rgba(61, 213, 152, 0.15);
                border-color: rgba(61, 213, 152, 0.3);
                color: #3dd598;
            }
            
            .auth-message.error {
                background: rgba(255, 107, 107, 0.15);
                border-color: rgba(255, 107, 107, 0.3);
                color: #ff6b6b;
            }
            
            .auth-message.hidden {
                display: none;
            }
            
            .auth-footer {
                text-align: center;
                margin-top: 15px;
                font-size: 0.9rem;
                color: var(--muted);
            }
            
            .auth-footer a {
                color: var(--brand);
                text-decoration: none;
                transition: var(--transition);
            }
            
            .auth-footer a:hover {
                text-decoration: underline;
            }
            
            .terms-group {
                display: flex;
                align-items: flex-start;
                margin: 15px 0;
                gap: 10px;
            }
            
            .terms-checkbox {
                margin-top: 3px;
                accent-color: var(--brand);
            }
            
            .terms-label {
                font-size: 0.85rem;
                color: var(--muted);
                line-height: 1.4;
            }
            
            .terms-label a {
                color: var(--brand);
                text-decoration: none;
            }
            
            .terms-label a:hover {
                text-decoration: underline;
            }
            
            .auth-separator {
                text-align: center;
                margin: 20px 0;
                position: relative;
                color: var(--muted);
            }
            
            .auth-separator:before {
                content: "";
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .auth-separator span {
                background: var(--panel);
                padding: 0 15px;
                position: relative;
                z-index: 1;
            }
            
            .quick-auth {
                margin-top: 20px;
            }
            
            .btn-google {
                width: 100%;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
                padding: 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: var(--transition);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                font-weight: 500;
            }
            
            .btn-google:hover {
                background: rgba(255, 255, 255, 0.12);
                transform: translateY(-2px);
            }
            
            .loading {
                position: relative;
                color: transparent !important;
            }
            
            .loading:after {
                content: "";
                position: absolute;
                width: 20px;
                height: 20px;
                border: 2px solid transparent;
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .user-menu {
                display: none;
                align-items: center;
                gap: 10px;
                background: rgba(106, 103, 255, 0.1);
                border: 1px solid rgba(106, 103, 255, 0.3);
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: var(--transition);
            }
            
            .user-menu:hover {
                background: rgba(106, 103, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .user-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--gradient);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.9rem;
            }
        </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Configuration des écouteurs de modales
    setupModalListeners() {
        // Fermer la modale
        document.getElementById('closeAuthModal')?.addEventListener('click', () => {
            this.hideAuthModal();
        });

        // Clic externe pour fermer
        document.getElementById('authModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'authModal') {
                this.hideAuthModal();
            }
        });

        // Basculer entre connexion/inscription
        document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Soumission des formulaires
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Mot de passe oublié
        document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // Connexion Google
        document.getElementById('googleAuth')?.addEventListener('click', () => {
            this.handleGoogleAuth();
        });
    }

    // Afficher la modale d'authentification
    showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.showLoginForm();
        }
    }

    // Cacher la modale d'authentification
    hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.clearForms();
        }
    }

    // Afficher le formulaire de connexion
    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('authModalTitle').innerHTML = '<i class="fas fa-sign-in-alt"></i> Connexion';
        this.hideMessage();
    }

    // Afficher le formulaire d'inscription
    showRegisterForm() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('authModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Créer un compte';
        this.hideMessage();
    }

    // Gérer la connexion
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginButton = document.getElementById('loginButton');

        if (!email || !password) {
            this.showMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        this.setButtonLoading(loginButton, true);

        try {
            const result = await this.authManager.login(email, password);
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                localStorage.setItem('cinetv_user_loggedin', 'true');
                
                setTimeout(() => {
                    this.hideAuthModal();
                    this.showMessage('Bienvenue !', 'success');
                }, 1500);
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la connexion', 'error');
        } finally {
            this.setButtonLoading(loginButton, false);
        }
    }

    // Gérer l'inscription
    async handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;
        const registerButton = document.getElementById('registerButton');

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            this.showMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        if (!acceptTerms) {
            this.showMessage('Veuillez accepter les conditions d\'utilisation', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
            return;
        }

        this.setButtonLoading(registerButton, true);

        try {
            const result = await this.authManager.register(email, password, name);
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                localStorage.setItem('cinetv_user_loggedin', 'true');
                
                setTimeout(() => {
                    this.hideAuthModal();
                    this.showMessage('Compte créé avec succès !', 'success');
                }, 1500);
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Erreur lors de la création du compte', 'error');
        } finally {
            this.setButtonLoading(registerButton, false);
        }
    }

    // Gérer le mot de passe oublié
    async handleForgotPassword() {
        const email = document.getElementById('loginEmail').value || prompt('Entrez votre adresse email:');
        
        if (email) {
            const result = await this.authManager.resetPassword(email);
            
            if (result.success) {
                this.showMessage(result.message, 'success');
            } else {
                this.showMessage(result.error, 'error');
            }
        }
    }

    // Gérer l'authentification Google
    async handleGoogleAuth() {
        this.showMessage('Connexion Google bientôt disponible', 'error');
        // Implémentation Google Auth à venir
    }

    // Afficher un message
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `auth-message ${type}`;
            messageEl.classList.remove('hidden');
            
            // Auto-masquer après 5 secondes
            setTimeout(() => {
                this.hideMessage();
            }, 5000);
        }
    }

    // Masquer le message
    hideMessage() {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.classList.add('hidden');
        }
    }

    // Gérer le chargement des boutons
    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Vider les formulaires
    clearForms() {
        const forms = document.querySelectorAll('#loginForm, #registerForm');
        forms.forEach(form => form.reset());
        this.hideMessage();
    }

    // Mettre à jour l'interface utilisateur (appelé par authManager)
    updateUI() {
        const authButton = document.getElementById('authButton');
        const userMenu = document.getElementById('userMenu');

        if (this.authManager.isLoggedIn()) {
            // Utilisateur connecté
            if (authButton) {
                authButton.style.display = 'none';
            }
            
            // Créer ou mettre à jour le menu utilisateur
            this.createUserMenu();
        } else {
            // Utilisateur non connecté
            if (authButton) {
                authButton.style.display = 'block';
            }
            
            if (userMenu) {
                userMenu.style.display = 'none';
            }
        }
    }

    // Créer le menu utilisateur
    createUserMenu() {
        let userMenu = document.getElementById('userMenu');
        const navbarRight = document.querySelector('.navbar-right');

        if (!userMenu && navbarRight) {
            userMenu = document.createElement('div');
            userMenu.id = 'userMenu';
            userMenu.className = 'user-menu';
            userMenu.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <span class="user-name">Mon Profil</span>
                <i class="fas fa-chevron-down"></i>
            `;

            userMenu.addEventListener('click', () => {
                this.showProfileModal();
            });

            // Remplacer le bouton d'auth par le menu utilisateur
            const authButton = document.getElementById('authButton');
            if (authButton) {
                authButton.replaceWith(userMenu);
            } else {
                navbarRight.appendChild(userMenu);
            }
        }

        if (userMenu) {
            userMenu.style.display = 'flex';
            
            // Mettre à jour le nom d'utilisateur
            const userName = userMenu.querySelector('.user-name');
            if (userName && this.authManager.currentUser) {
                userName.textContent = this.authManager.currentUser.displayName || 'Mon Profil';
            }
        }
    }

    // Afficher la modale de profil
    showProfileModal() {
        // Rediriger vers la page de profil
        window.location.href = 'profile.html';
    }
}

// Initialiser l'interface d'authentification au chargement
document.addEventListener('DOMContentLoaded', () => {
    window.authUI = new AuthUI();
    console.log('✅ Interface d\'authentification initialisée');
});

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUI;
}