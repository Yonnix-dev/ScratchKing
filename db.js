// db.js - Database functions
import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

export async function createAccount(username, password) {
  const ref = doc(db, "users", username.toLowerCase());
  const snap = await getDoc(ref);
  if (snap.exists()) return { error: "Ce pseudo est déjà pris." };
  const data = {
    username,
    password,
    credits: 500,
    xp: 0,
    level: 1,
    debt: 0,
    skin: "default",
    ownedSkins: ["default"],
    lastRoulette: null,
    createdAt: Date.now()
  };
  await setDoc(ref, data);
  return { success: true, data };
}

export async function loginAccount(username, password) {
  const ref = doc(db, "users", username.toLowerCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return { error: "Compte introuvable." };
  const data = snap.data();
  if (data.password !== password) return { error: "Mot de passe incorrect." };
  return { success: true, data };
}

export async function savePlayer(username, data) {
  const ref = doc(db, "users", username.toLowerCase());
  await updateDoc(ref, data);
}

export async function getAllPlayers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => d.data());
}

export async function initAdmin() {
  const ref = doc(db, "users", "admin");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      username: "ADMIN",
      password: "135975",
      credits: 999999,
      xp: 0,
      level: 99,
      debt: 0,
      skin: "default",
      ownedSkins: ["default"],
      lastRoulette: null,
      createdAt: Date.now()
    });
  }
}
