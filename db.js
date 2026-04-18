// db.js - Database functions via JSONBin.io
import { JSONBIN_KEY, JSONBIN_URL } from "./firebase-config.js";

const HEADERS = {
  "Content-Type": "application/json",
  "X-Master-Key": JSONBIN_KEY,
  "X-Bin-Meta": "false"
};

// Charge tout le bin
async function loadBin() {
  const res = await fetch(JSONBIN_URL, { headers: HEADERS });
  const json = await res.json();
  return json.record || json;
}

// Sauvegarde tout le bin
async function saveBin(data) {
  await fetch(JSONBIN_URL, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(data)
  });
}

export async function createAccount(username, password) {
  const bin = await loadBin();
  const key = username.toLowerCase();
  if (bin.users && bin.users[key]) return { error: "Ce pseudo est déjà pris." };
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
  if (!bin.users) bin.users = {};
  bin.users[key] = data;
  await saveBin(bin);
  return { success: true, data };
}

export async function loginAccount(username, password) {
  const bin = await loadBin();
  const key = username.toLowerCase();
  if (!bin.users || !bin.users[key]) return { error: "Compte introuvable." };
  const data = bin.users[key];
  if (data.password !== password) return { error: "Mot de passe incorrect." };
  return { success: true, data };
}

export async function savePlayer(username, data) {
  const bin = await loadBin();
  const key = username.toLowerCase();
  if (!bin.users) bin.users = {};
  bin.users[key] = data;
  await saveBin(bin);
}

export async function getAllPlayers() {
  const bin = await loadBin();
  if (!bin.users) return [];
  return Object.values(bin.users);
}

export async function initAdmin() {
  const bin = await loadBin();
  if (!bin.users) bin.users = {};
  if (!bin.users["admin"]) {
    bin.users["admin"] = {
      username: "ADMIN",
      password: "135975",
      credits: 999999,
      xp: 0,
      level: 99,
      debt: 0,
      skin: "default",
      ownedSkins: ["default"],
      lastRoulette: null,
      createdAt: 0
    };
    await saveBin(bin);
  }
}
