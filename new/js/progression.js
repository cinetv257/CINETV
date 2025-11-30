// js/progression.js
import { db, auth } from './firebase.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    increment, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Obtenir le numéro de semaine actuel
function getCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

// Obtenir le début de la semaine (lundi)
function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi
    return new Date(now.setDate(diff));
}

// Ajouter des points à un utilisateur
export async function addPoints(points, actionType) {
    const user = auth.currentUser;
    if (!user) return;

    const currentWeek = getCurrentWeek();
    const userRef = doc(db, 'users', user.uid);
    const leaderboardRef = doc(db, 'leaderboard', currentWeek.toString(), user.uid);

    try {
        // Mettre à jour les points hebdomadaires de l'utilisateur
        await updateDoc(userRef, {
            weeklyPoints: increment(points),
            totalPoints: increment(points),
            lastAction: serverTimestamp()
        });

        // Mettre à jour le classement pour cette semaine
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        
        await setDoc(leaderboardRef, {
            uid: user.uid,
            displayName: userData.displayName,
            profilePic: userData.profilePic,
            weeklyPoints: userData.weeklyPoints + points,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Vérifier les seuils de points pour les notifications
        checkPointsThreshold(userData.weeklyPoints + points);

        console.log(`${points} points ajoutés pour ${actionType}`);

    } catch (error) {
        console.error("Erreur lors de l'ajout de points: ", error);
    }
}

// Vérifier les seuils de points pour afficher des notifications
function checkPointsThreshold(currentPoints) {
    const thresholds = [10, 25, 50, 100, 200, 500];
    
    thresholds.forEach(threshold => {
        if (currentPoints >= threshold && currentPoints - threshold < 5) {
            showPointsNotification(threshold);
        }
    });
}

// Afficher une notification de points
function showPointsNotification(threshold) {
    if (!document.getElementById('pointsNotification')) {
        const notification = document.createElement('div');
        notification.id = 'pointsNotification';
        notification.className = 'points-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="fire-icon">🔥</span>
                <p>You reached ${threshold} points this week!</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Obtenir les points hebdomadaires d'un utilisateur
export async function getUserWeeklyPoints(uid) {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return userSnap.data().weeklyPoints || 0;
        }
        return 0;
    } catch (error) {
        console.error("Erreur lors de la récupération des points: ", error);
        return 0;
    }
}

// Obtenir le classement de l'utilisateur
export async function getUserRank(uid) {
    try {
        const currentWeek = getCurrentWeek();
        const leaderboardRef = collection(db, 'leaderboard', currentWeek.toString());
        const q = query(leaderboardRef, where('uid', '==', uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            // Obtenir tous les utilisateurs pour calculer le rang
            const allUsersQuery = query(leaderboardRef);
            const allUsersSnapshot = await getDocs(allUsersQuery);
            const users = [];
            
            allUsersSnapshot.forEach(doc => {
                users.push(doc.data());
            });
            
            // Trier par points et trouver le rang
            users.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
            const rank = users.findIndex(user => user.uid === uid) + 1;
            
            return rank;
        }
        return null;
    } catch (error) {
        console.error("Erreur lors de la récupération du rang: ", error);
        return null;
    }
}

// Réinitialiser les points hebdomadaires (à exécuter manuellement ou via Cloud Functions)
export async function resetWeeklyPoints() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        
        usersSnapshot.forEach((doc) => {
            const userRef = doc.ref;
            batch.update(userRef, {
                weeklyPoints: 0,
                lastReset: serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log("Points hebdomadaires réinitialisés");
    } catch (error) {
        console.error("Erreur lors de la réinitialisation des points: ", error);
    }
}

// Points pour différentes actions
export const POINTS = {
    POST: 5,
    COMMENT: 2,
    LIKE: 1,
    FRIEND_ADD: 3,
    PROFILE_COMPLETE: 10
};