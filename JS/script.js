document.addEventListener('DOMContentLoaded', () => {
    // Initialiser Firebase (remplacez par votre propre configuration)
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // Gestion des formulaires
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        toggleLoading(true, 'loginBtn', 'Se connecter');

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                showAuthMessage('Connexion réussie ! Redirection...', 'success');
                localStorage.setItem('cineTvUserLoggedIn', 'true');
                setTimeout(() => window.location.href = 'home.html', 1500);
            })
            .catch((error) => {
                showAuthMessage(`Erreur de connexion : ${error.message}`, 'error');
                toggleLoading(false, 'loginBtn', 'Se connecter');
            });
    });

    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        toggleLoading(true, 'registerBtn', 'S\'inscrire');

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                showAuthMessage('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success');
                setTimeout(() => {
                    document.getElementById('registerForm').classList.add('hidden');
                    document.getElementById('loginForm').classList.remove('hidden');
                    document.getElementById('form-title').innerHTML = '<i class="fas fa-sign-in-alt"></i> Connexion';
                }, 1500);
                toggleLoading(false, 'registerBtn', 'S\'inscrire');
            })
            .catch((error) => {
                showAuthMessage(`Erreur d'inscription : ${error.message}`, 'error');
                toggleLoading(false, 'registerBtn', 'S\'inscrire');
            });
    });

    // Connexion Google
    document.getElementById('googleLoginBtn').addEventListener('click', () => {
        auth.signInWithPopup(googleProvider)
            .then(() => {
                showAuthMessage('Connexion Google réussie ! Redirection...', 'success');
                localStorage.setItem('cineTvUserLoggedIn', 'true');
                setTimeout(() => window.location.href = 'home.html', 1500);
            })
            .catch((error) => {
                showAuthMessage(`Erreur de connexion Google : ${error.message}`, 'error');
            });
    });

    function showAuthMessage(message, type) {
        const msgElement = document.getElementById('auth-message');
        msgElement.textContent = message;
        msgElement.className = `auth-message ${type}-message`;
        msgElement.classList.remove('hidden');
    }

    function toggleLoading(isLoading, buttonId, originalText) {
        const button = document.getElementById(buttonId);
        const btnText = document.getElementById(`${buttonId}Text`);
        if (isLoading) {
            button.classList.add('loading');
            btnText.textContent = 'Chargement...';
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            btnText.textContent = originalText;
            button.disabled = false;
        }
    }

    // Changement de formulaire (Connexion/Inscription)
    document.getElementById('switch-to-register').addEventListener('click', () => {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('form-title').innerHTML = '<i class="fas fa-user-plus"></i> Inscription';
        document.getElementById('auth-message').classList.add('hidden');
    });

    document.getElementById('switch-to-login').addEventListener('click', () => {
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('form-title').innerHTML = '<i class="fas fa-sign-in-alt"></i> Connexion';
        document.getElementById('auth-message').classList.add('hidden');
    });

    // Vérifier si l'utilisateur est déjà connecté
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('Utilisateur déjà connecté:', user.email);
            // Stocker l'état de connexion dans le localStorage
            localStorage.setItem('cineTvUserLoggedIn', 'true');
            // Redirection automatique si déjà connecté
            window.location.href = 'home.html';
        }
    });

    // Vérifier le localStorage au chargement de la page
    document.addEventListener('DOMContentLoaded', () => {
        const isLoggedIn = localStorage.getItem('cineTvUserLoggedIn') === 'true';
        if (isLoggedIn) {
            window.location.href = 'home.html';
        }
    });
});
