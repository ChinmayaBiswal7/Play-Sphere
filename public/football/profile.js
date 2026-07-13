/**
 * Football Pro 2026 - Firebase Career Profile Integration Module
 */

import { gameState } from './state.js';

export const FirebaseSync = {
  firebaseConfig: {
    apiKey: "AIzaSyBIH1XsOOXjNxfTB549C2YTRglPP2RsGtU",
    authDomain: "cricket-game-23c2f.firebaseapp.com",
    projectId: "cricket-game-23c2f",
    storageBucket: "cricket-game-23c2f.firebasestorage.app",
    messagingSenderId: "107563346860",
    appId: "1:107563346860:web:b79ed3a9e5bc55071de809",
    measurementId: "G-4JVT3Y7K70"
  },
  currentUser: null,
  profile: {
    username: "Guest Gamer",
    xp: 0,
    coins: 0,
    played: 0,
    won: 0,
    lost: 0,
    football_goals: 0,
    football_played: 0,
    football_won: 0,
    football_lost: 0
  },
  firebaseLoaded: false,

  async init() {
    try {
      console.log("Dynamically loading Firebase inside Football Pro...");
      const [
        { initializeApp },
        { getAuth, onAuthStateChanged },
        { getFirestore, doc, getDoc, updateDoc }
      ] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')
      ]);

      const app = initializeApp(this.firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
          console.log("Football: Synced active user:", user.email);
          
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            Object.assign(this.profile, data);
            this.profile.football_goals = this.profile.football_goals || 0;
            this.profile.football_played = this.profile.football_played || 0;
            this.profile.football_won = this.profile.football_won || 0;
            this.profile.football_lost = this.profile.football_lost || 0;
          }
        } else {
          this.loadLocalProfile();
        }
        this.updateProfileHUD();
      });

      this.db = db;
      this.docRef = doc;
      this.updateDocRef = updateDoc;
      this.firebaseLoaded = true;
    } catch (e) {
      console.warn("Firebase CDN offline or blocked. Running local Guest storage.", e);
      this.loadLocalProfile();
      this.updateProfileHUD();
    }
  },

  loadLocalProfile() {
    const saved = localStorage.getItem('apex_cricket_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(this.profile, parsed);
        this.profile.football_goals = this.profile.football_goals || 0;
        this.profile.football_played = this.profile.football_played || 0;
        this.profile.football_won = this.profile.football_won || 0;
        this.profile.football_lost = this.profile.football_lost || 0;
      } catch(e) {}
    }
  },

  updateProfileHUD() {
    const usernameEl = document.getElementById('menu-username');
    const levelBadgeEl = document.getElementById('menu-userlevel-badge');
    const xpFillEl = document.getElementById('menu-xp-fill');
    const xpRatioEl = document.getElementById('menu-xp-ratio');
    const coinEl = document.getElementById('menu-coin-count');
    const gemEl = document.getElementById('menu-gem-count');
    
    const xp = this.profile.xp || 0;
    const level = Math.floor(xp / 500) + 1;
    const isGuest = !this.currentUser;
    const xpInLevel = xp % 500;

    if (usernameEl) usernameEl.innerText = this.profile.username || "Guest Gamer";
    if (levelBadgeEl) levelBadgeEl.innerText = `LEVEL ${level} ${isGuest ? 'GUEST' : 'MEMBER'}`;
    if (xpRatioEl) xpRatioEl.innerText = `${xpInLevel} / 500 XP`;
    if (xpFillEl) xpFillEl.style.width = `${(xpInLevel / 500) * 100}%`;
    if (coinEl) coinEl.innerText = (this.profile.coins || 12450).toLocaleString();
    if (gemEl) gemEl.innerText = (this.profile.gems || 860).toLocaleString();
  },

  async recordMatchStats(userGoals, oppGoals) {
    this.profile.football_played += 1;
    this.profile.football_goals += userGoals;
    
    let xpGained = 50 + userGoals * 25;
    if (userGoals > oppGoals) {
      this.profile.football_won += 1;
      xpGained += 100;
    } else if (userGoals < oppGoals) {
      this.profile.football_lost += 1;
      xpGained += 20;
    }
    this.profile.xp = (this.profile.xp || 0) + xpGained;
    
    localStorage.setItem('apex_cricket_profile', JSON.stringify(this.profile));

    if (this.currentUser && this.firebaseLoaded) {
      try {
        const userRef = this.docRef(this.db, "users", this.currentUser.uid);
        await this.updateDocRef(userRef, {
          football_played: this.profile.football_played,
          football_goals: this.profile.football_goals,
          football_won: this.profile.football_won,
          football_lost: this.profile.football_lost,
          xp: this.profile.xp
        });
        console.log("Firestore updated match results successfully.");
      } catch (e) {
        console.error("Firestore sync failed:", e);
      }
    }
    return xpGained;
  }
};
