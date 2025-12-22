// Point d'entrée principal de l'application

import { initAuth, isUserLoggedIn, getCurrentUser, waitForAuth } from './auth.js';

// Initialiser l'application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initialisation de l\'application...');
    
    // Initialiser l'authentification
    await initAuth((isLoggedIn, user) => {
        console.log('Callback auth:', isLoggedIn ? 'Connecté' : 'Déconnecté', user?.email);
        
        // Vérifier la page actuelle et initialiser les modules correspondants
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'index.html':
            case '':
                if (isLoggedIn) {
                    console.log('Redirection vers dashboard depuis login');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 500);
                } else {
                    initLoginPage();
                }
                break;
                
            case 'register.html':
                if (isLoggedIn) {
                    console.log('Redirection vers dashboard depuis register');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 500);
                } else {
                    initRegisterPage();
                }
                break;
                
            case 'dashboard.html':
                if (!isLoggedIn) {
                    console.log('Redirection vers index depuis dashboard');
                    // La redirection se fait déjà dans initAuth
                } else {
                    // Attendre un peu que tout soit prêt
                    setTimeout(() => {
                        initDashboardPage(user);
                    }, 100);
                }
                break;
                
            case 'chat.html':
                if (!isLoggedIn) {
                    console.log('Redirection vers index depuis chat');
                } else {
                    setTimeout(() => {
                        initChatPage(user);
                    }, 100);
                }
                break;
                
            case 'story.html':
                if (!isLoggedIn) {
                    console.log('Redirection vers index depuis story');
                } else {
                    setTimeout(() => {
                        initStoryPage(user);
                    }, 100);
                }
                break;
                
            case 'profile.html':
                if (!isLoggedIn) {
                    console.log('Redirection vers index depuis profile');
                } else {
                    setTimeout(() => {
                        initProfilePage(user);
                    }, 100);
                }
                break;
        }
    });
    
    // Vérification supplémentaire après 2 secondes
    setTimeout(() => {
        const currentPage = window.location.pathname.split('/').pop();
        const protectedPages = ['dashboard.html', 'chat.html', 'story.html', 'profile.html'];
        
        if (protectedPages.includes(currentPage) && !isUserLoggedIn()) {
            console.log('Vérification tardive: non connecté, redirection');
            window.location.href = 'index.html';
        }
    }, 2000);
});

// Initialiser la page de login
function initLoginPage() {
    console.log('Initialisation page login');
    
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validation basique
            if (!email || !password) {
                showError("Veuillez remplir tous les champs");
                return;
            }
            
            try {
                const { loginUser } = await import('./auth.js');
                const result = await loginUser(email, password);
                
                if (result.success) {
                    // Désactiver le bouton pendant la redirection
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
                    
                    // Redirection vers le dashboard
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showError(result.error);
                }
            } catch (error) {
                console.error("Erreur de connexion:", error);
                showError("Une erreur est survenue lors de la connexion");
            }
        });
    }
    
    // Lien vers l'inscription
    const registerLink = document.getElementById('register-link');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'register.html';
        });
    }
    
    // Afficher les erreurs
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = message ? 'block' : 'none';
        }
    }
}

// Initialiser la page d'inscription
function initRegisterPage() {
    console.log('Initialisation page register');
    
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const profileImageInput = document.getElementById('profile-image');
    const profileImagePreview = document.getElementById('profile-image-preview');
    
    // Prévisualisation de l'image de profil
    if (profileImageInput && profileImagePreview) {
        profileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    profileImagePreview.src = event.target.result;
                    profileImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const profileImageFile = profileImageInput?.files[0];
            
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                showError("Veuillez remplir tous les champs obligatoires");
                return;
            }
            
            if (password !== confirmPassword) {
                showError("Les mots de passe ne correspondent pas");
                return;
            }
            
            if (password.length < 6) {
                showError("Le mot de passe doit contenir au moins 6 caractères");
                return;
            }
            
            try {
                // Désactiver le bouton
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
                
                // Inscription de l'utilisateur
                const { registerUser } = await import('./auth.js');
                const result = await registerUser(email, password, name, profileImageFile);
                
                if (result.success) {
                    // Redirection vers le dashboard
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showError(result.error);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> S\'inscrire';
                }
            } catch (error) {
                console.error("Erreur d'inscription:", error);
                showError("Une erreur est survenue lors de l'inscription");
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> S\'inscrire';
            }
        });
    }
    
    // Lien vers la connexion
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }
    
    // Afficher les erreurs
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = message ? 'block' : 'none';
        }
    }
}

// Initialiser la page dashboard
async function initDashboardPage(user) {
    console.log('Initialisation page dashboard pour:', user.email);
    
    try {
        const { initDashboard } = await import('./dashboard.js');
        await initDashboard();
    } catch (error) {
        console.error('Erreur d\'initialisation du dashboard:', error);
    }
}

// Initialiser la page chat
async function initChatPage(user) {
    console.log('Initialisation page chat pour:', user.email);
    
    try {
        const { initChat } = await import('./chat.js');
        await initChat();
    } catch (error) {
        console.error('Erreur d\'initialisation du chat:', error);
    }
}

// Initialiser la page story
async function initStoryPage(user) {
    console.log('Initialisation page story pour:', user.email);
    
    try {
        const { initStories } = await import('./story.js');
        await initStories();
    } catch (error) {
        console.error('Erreur d\'initialisation des stories:', error);
    }
}

// Initialiser la page profile
async function initProfilePage(user) {
    console.log('Initialisation page profile pour:', user.email);
    
    try {
        const { initProfile } = await import('./profile.js');
        await initProfile();
    } catch (error) {
        console.error('Erreur d\'initialisation du profil:', error);
    }
}

// Gérer la déconnexion
window.logout = async function() {
    try {
        const { logoutUser } = await import('./auth.js');
        await logoutUser();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Erreur de déconnexion:", error);
    }
};