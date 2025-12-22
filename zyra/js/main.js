// Point d'entrée principal de l'application

import { initAuth } from './auth.js';

// Initialiser l'authentification
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser Firebase Auth
    initAuth();
    
    // Vérifier la page actuelle et initialiser les modules correspondants
    const currentPage = window.location.pathname.split('/').pop();
    
    switch (currentPage) {
        case 'index.html':
        case '':
            // Initialiser la page de login
            initLoginPage();
            break;
            
        case 'register.html':
            // Initialiser la page d'inscription
            initRegisterPage();
            break;
            
        case 'dashboard.html':
            // Initialiser le dashboard
            import('./dashboard.js').then(module => {
                module.initDashboard();
            });
            break;
            
        case 'chat.html':
            // Initialiser le chat
            import('./chat.js').then(module => {
                module.initChat();
            });
            break;
            
        case 'story.html':
            // Initialiser les stories
            import('./story.js').then(module => {
                module.initStories();
            });
            break;
            
        case 'profile.html':
            // Initialiser le profil
            import('./profile.js').then(module => {
                module.initProfile();
            });
            break;
    }
});

// Initialiser la page de login
function initLoginPage() {
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
                    // Redirection vers le dashboard se fera automatiquement via initAuth
                    showError(""); // Effacer les erreurs
                } else {
                    showError(result.error);
                }
            } catch (error) {
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
                // Upload de l'image vers ImgBB si fournie
                let profileImageUrl = null;
                
                if (profileImageFile) {
                    const { IMGBB_API_KEY } = await import('./firebase-config.js');
                    
                    const formData = new FormData();
                    formData.append('key', IMGBB_API_KEY);
                    formData.append('image', profileImageFile);
                    
                    const response = await fetch('https://api.imgbb.com/1/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        profileImageUrl = result.data.url;
                    } else {
                        showError("Erreur lors de l'upload de l'image de profil");
                        return;
                    }
                }
                
                // Inscription de l'utilisateur
                const { registerUser } = await import('./auth.js');
                const result = await registerUser(email, password, name, profileImageUrl);
                
                if (result.success) {
                    // Redirection vers le dashboard se fera automatiquement via initAuth
                    showError(""); // Effacer les erreurs
                } else {
                    showError(result.error);
                }
            } catch (error) {
                console.error("Erreur d'inscription:", error);
                showError("Une erreur est survenue lors de l'inscription");
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