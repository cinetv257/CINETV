// Fonctions utilitaires générales

// Formater la date
export const formatDate = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const messageDate = new Date(date);
    const diffTime = Math.abs(now - messageDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return "Aujourd'hui";
    } else if (diffDays === 1) {
        return "Hier";
    } else if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
    } else {
        return messageDate.toLocaleDateString();
    }
};

// Formater l'heure
export const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Tronquer le texte
export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// Vérifier si un élément est visible dans le viewport
export const isElementInViewport = (element) => {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
};

// Débounce function
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Générer un ID unique
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Valider l'email
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Valider le mot de passe
export const isValidPassword = (password) => {
    return password.length >= 6;
};

// Télécharger un fichier
export const downloadFile = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Copier le texte dans le presse-papier
export const copyToClipboard = (text) => {
    return navigator.clipboard.writeText(text);
};

// Afficher une notification
export const showNotification = (message, type = 'info', duration = 3000) => {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Ajouter au document
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Fermer la notification
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        hideNotification(notification);
    });
    
    // Fermeture automatique
    if (duration > 0) {
        setTimeout(() => {
            hideNotification(notification);
        }, duration);
    }
    
    return notification;
};

// Cacher une notification
export const hideNotification = (notification) => {
    if (!notification) return;
    
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
};

// Prévisualiser l'image
export const previewImage = (file, callback) => {
    if (!file || !file.type.startsWith('image/')) {
        callback(null, "Veuillez sélectionner une image valide");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        callback(e.target.result, null);
    };
    reader.onerror = () => {
        callback(null, "Erreur de lecture de l'image");
    };
    reader.readAsDataURL(file);
};

// Compresser l'image
export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Redimensionner si nécessaire
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("Échec de la compression"));
                            return;
                        }
                        resolve(blob);
                    },
                    file.type,
                    quality
                );
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

// Charger les données depuis le localStorage
export const loadFromLocalStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error("Erreur de lecture du localStorage:", error);
        return defaultValue;
    }
};

// Sauvegarder les données dans le localStorage
export const saveToLocalStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Erreur d'écriture dans le localStorage:", error);
        return false;
    }
};

// Supprimer les données du localStorage
export const removeFromLocalStorage = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error("Erreur de suppression du localStorage:", error);
        return false;
    }
};

// Gérer les erreurs Firebase
export const handleFirebaseError = (error) => {
    let message = "Une erreur est survenue";
    
    switch (error.code) {
        case 'auth/invalid-email':
            message = "Adresse email invalide";
            break;
        case 'auth/user-disabled':
            message = "Ce compte a été désactivé";
            break;
        case 'auth/user-not-found':
            message = "Aucun compte trouvé avec cet email";
            break;
        case 'auth/wrong-password':
            message = "Mot de passe incorrect";
            break;
        case 'auth/email-already-in-use':
            message = "Cette adresse email est déjà utilisée";
            break;
        case 'auth/weak-password':
            message = "Le mot de passe est trop faible";
            break;
        case 'permission-denied':
            message = "Permission refusée";
            break;
        default:
            message = error.message || message;
    }
    
    return message;
};

// Vérifier la connexion internet
export const checkInternetConnection = () => {
    return navigator.onLine;
};

// Écouter les changements de connexion
export const setupConnectionListener = (onlineCallback, offlineCallback) => {
    window.addEventListener('online', onlineCallback);
    window.addEventListener('offline', offlineCallback);
};

// Formater la taille du fichier
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Obtenir l'extension d'un fichier
export const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
};

// Créer un élément avec des attributs
export const createElement = (tag, attributes = {}, children = []) => {
    const element = document.createElement(tag);
    
    // Ajouter les attributs
    Object.keys(attributes).forEach(key => {
        if (key === 'className') {
            element.className = attributes[key];
        } else if (key === 'textContent') {
            element.textContent = attributes[key];
        } else if (key === 'innerHTML') {
            element.innerHTML = attributes[key];
        } else {
            element.setAttribute(key, attributes[key]);
        }
    });
    
    // Ajouter les enfants
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    
    return element;
};

// Animation de fade in
export const fadeIn = (element, duration = 300) => {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.min(progress / duration, 1);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
            window.requestAnimationFrame(animate);
        }
    };
    
    window.requestAnimationFrame(animate);
};

// Animation de fade out
export const fadeOut = (element, duration = 300) => {
    let start = null;
    
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.max(1 - (progress / duration), 0);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
            window.requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    };
    
    window.requestAnimationFrame(animate);
};