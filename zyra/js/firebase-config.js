// Import des modules Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDatabase, ref, set, onValue, push, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCRzwe1j2lKewQktmA122xa4mEiLO4rRTI",
    authDomain: "zyrachat-345d7.firebaseapp.com",
    projectId: "zyrachat-345d7",
    storageBucket: "zyrachat-345d7.firebasestorage.app",
    messagingSenderId: "189569497608",
    appId: "1:189569497608:web:8243ed345b357dbda0efbd",
    measurementId: "G-P94X9L1QSK",
    databaseURL: "https://zyrachat-345d7-default-rtdb.firebaseio.com/"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDB = getDatabase(app);

// Clé API ImgBB
const IMGBB_API_KEY = "3380c77ffa8895e275acf5b67038d9f5";

// Exporter les modules
export {
    auth,
    db,
    realtimeDB,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    setDoc,
    getDoc,
    ref,
    set,
    onValue,
    push,
    get,
    child,
    IMGBB_API_KEY
};