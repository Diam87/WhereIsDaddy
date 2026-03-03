import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

// 🔥 PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyBPgkxQU_ycUj8y-s2Exz02qqOuqEZJ08A",
  authDomain: "whereisdaddy-93d7d.firebaseapp.com",
  databaseURL: "https://whereisdaddy-93d7d-default-rtdb.firebaseio.com",
  projectId: "whereisdaddy-93d7d",
  storageBucket: "whereisdaddy-93d7d.firebasestorage.app",
  messagingSenderId: "1002324574371",
  appId: "1:1002324574371:web:ab4b1de83c5c5038c97f16"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, get, onValue };