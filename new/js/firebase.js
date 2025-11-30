// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9tJnthnxnNyTvurKGw4Z6ujXlbkEJ0pE",
  authDomain: "ciinetvbase.firebaseapp.com",
  projectId: "ciinetvbase",
  storageBucket: "ciinetvbase.firebasestorage.app",
  messagingSenderId: "227737440438",
  appId: "1:227737440438:web:89f7622c92be8287185617",
  measurementId: "G-VWZ4P2DHPR"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);

// Initialisation des services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);