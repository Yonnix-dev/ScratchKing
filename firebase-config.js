// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REMPLACE_PAR_TON_API_KEY",
  authDomain: "REMPLACE.firebaseapp.com",
  projectId: "REMPLACE_PAR_TON_PROJECT_ID",
  storageBucket: "REMPLACE.appspot.com",
  messagingSenderId: "REMPLACE",
  appId: "REMPLACE"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
