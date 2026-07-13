// Career Profile System & Firebase Integration Module
import { CricketAudio } from '../useCricketAudio.js?v=43';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIH1XsOOXjNxfTB549C2YTRglPP2RsGtU",
  authDomain: "cricket-game-23c2f.firebaseapp.com",
  projectId: "cricket-game-23c2f",
  storageBucket: "cricket-game-23c2f.firebasestorage.app",
  messagingSenderId: "107563346860",
  appId: "1:107563346860:web:b79ed3a9e5bc55071de809",
  measurementId: "G-4JVT3Y7K70"
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let firebaseLoaded = false;
let firebasePromise = null;

// Dynamic helpers to reference firebase modules after import
let fb_doc = null;
let fb_getDoc = null;
let fb_setDoc = null;
let fb_signInWithPopup = null;
let fb_signOut = null;
let fb_signInWithEmailAndPassword = null;
let fb_createUserWithEmailAndPassword = null;

// Expose globally immediately so dashboard calls don't hit undefined races
window.fbSignInWithEmail = async (email, password) => {
  const loaded = await ensureFirebase();
  if (!loaded || !fb_signInWithEmailAndPassword) {
    throw new Error("Could not initialize Firebase connection.");
  }
  return fb_signInWithEmailAndPassword(auth, email, password);
};

window.fbCreateUserWithEmail = async (email, password) => {
  const loaded = await ensureFirebase();
  if (!loaded || !fb_createUserWithEmailAndPassword) {
    throw new Error("Could not initialize Firebase connection.");
  }
  return fb_createUserWithEmailAndPassword(auth, email, password);
};

export async function ensureFirebase() {
  if (firebaseLoaded) return true;
  if (firebasePromise) return firebasePromise;

  firebasePromise = (async () => {
    try {
      console.log("Loading Firebase SDKs dynamically...");
      
      const [
        { initializeApp },
        { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword },
        { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove }
      ] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')
      ]);

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      googleProvider = new GoogleAuthProvider();

      fb_doc = doc;
      fb_getDoc = getDoc;
      fb_setDoc = setDoc;
      fb_signInWithPopup = signInWithPopup;
      fb_signOut = signOut;
      fb_signInWithEmailAndPassword = signInWithEmailAndPassword;
      fb_createUserWithEmailAndPassword = createUserWithEmailAndPassword;

      window.fb_collection = collection;
      window.fb_query = query;
      window.fb_where = where;
      window.fb_getDocs = getDocs;
      window.fb_updateDoc = updateDoc;
      window.fb_arrayUnion = arrayUnion;
      window.fb_arrayRemove = arrayRemove;
      window.fb_db = db;

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          window.currentUser = user;
          console.log("Firebase Auth State Changed: User signed in:", user.displayName || user.email);
        } else {
          window.currentUser = null;
          console.log("Firebase Auth State Changed: Guest user");
        }
        await loadProfileCloud(); // sync with cloud once authenticated
        if (typeof window.updatePresence === 'function') {
          window.updatePresence('Idle');
        }

        // After profile loads, refresh the entire PS5 dashboard UI
        // This auto-closes the login modal for returning logged-in users
        if (typeof window.syncPlaySphereProfileDisplay === 'function') {
          window.syncPlaySphereProfileDisplay();
        }

        // If a returning user is fully logged in, dismiss the lock-screen modal
        if (user && !window.profileNeedsComplete) {
          const profModal = document.getElementById('ps5-profile-modal');
          if (profModal) profModal.classList.remove('show');
        }
      });

      firebaseLoaded = true;
      console.log("Firebase dynamically loaded and initialized successfully!");
      return true;
    } catch (err) {
      console.warn("Firebase could not be loaded dynamically (offline or CDN blocked). Falling back to local storage.", err);
      firebaseLoaded = false;
      firebasePromise = null;
      return false;
    }
  })();

  return firebasePromise;
}

export async function loadProfile() {
  // 1. Sync guest profile from local storage immediately so UI is populated with guest data instantly
  const profile = window.profile;
  const saved = localStorage.getItem('apex_cricket_profile');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(profile, parsed);
    } catch (e) {
      console.error("Error parsing local profile:", e);
    }
  }
  updateProfileUI();

  // 2. Load Firebase in the background. If user is logged in, this will update to their cloud profile.
  ensureFirebase().then((hasFirebase) => {
    if (hasFirebase && window.currentUser) {
      loadProfileCloud();
    }
  }).catch((err) => {
    console.warn("Background Firebase initialization failed:", err);
  });
}

export async function saveProfile() {
  await saveProfileCloud();
}

async function loadProfileCloud() {
  const profile = window.profile;
  const hasFirebase = await ensureFirebase();
  const currentUser = window.currentUser;
  
  if (hasFirebase && currentUser) {
    try {
      const userRef = fb_doc(db, "users", currentUser.uid);
      const snap = await fb_getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        Object.assign(profile, data);
        profile.coins = profile.coins || 0;
        profile.achievements = profile.achievements || [];
        profile.unlockedItems = profile.unlockedItems || [];
        profile.equippedBat = profile.equippedBat || 'default';
        
        if (!profile.username || !profile.dob) {
          window.profileNeedsComplete = true;
        } else {
          window.profileNeedsComplete = false;
        }
        console.log("Profile loaded from Firestore:", profile);
      } else {
        // First-time login: Flag that we need to complete the profile with Name and DOB!
        window.profileNeedsComplete = true;
        profile.username = '';
        profile.dob = '';
        profile.coins = 0;
        profile.achievements = [];
        profile.unlockedItems = [];
        profile.equippedBat = 'default';
        console.log("Initial profile needs completion.");
      }
    } catch (err) {
      console.error("Error loading profile from Firestore:", err);
    }
  }
  updateProfileUI();
}

window.saveUserProfileDetails = async (username, dob) => {
  const profile = window.profile;
  const currentUser = window.currentUser;
  if (!currentUser) return;
  
  profile.username = username;
  profile.dob = dob;
  window.profileNeedsComplete = false;
  
  await saveProfileCloud();
};

async function saveProfileCloud() {
  const profile = window.profile;
  const hasFirebase = await ensureFirebase();
  const currentUser = window.currentUser;

  if (hasFirebase && currentUser) {
    try {
      const userRef = fb_doc(db, "users", currentUser.uid);
      await fb_setDoc(userRef, {
        username: profile.username,
        dob: profile.dob || '',
        played: profile.played,
        won: profile.won,
        lost: profile.lost,
        runs: profile.runs,
        wickets: profile.wickets,
        xp: profile.xp,
        coins: profile.coins || 0,
        achievements: profile.achievements || [],
        unlockedItems: profile.unlockedItems || [],
        equippedBat: profile.equippedBat || 'default'
      });
      console.log("Profile saved to Firestore successfully.");
    } catch (err) {
      console.error("Error saving profile to Firestore:", err);
    }
  } else {
    localStorage.setItem('apex_cricket_profile', JSON.stringify(profile));
  }
  updateProfileUI();
}

export function updateProfileUI() {
  const profile = window.profile;
  const ui = window.ui;
  const currentUser = window.currentUser;

  const level = Math.floor((profile.xp || 0) / 500) + 1;
  const currentXp = (profile.xp || 0) % 500;
  const xpPercent = Math.min(100, (currentXp / 500) * 100);

  if (ui.menuProfName) ui.menuProfName.innerText = profile.username;
  if (ui.menuProfLevel) ui.menuProfLevel.innerText = `LVL ${level}`;
  if (ui.menuProfXp) ui.menuProfXp.innerText = `${currentXp} / 500 XP`;
  if (ui.menuProfXpFill) ui.menuProfXpFill.style.width = `${xpPercent}%`;

  if (ui.profileUsernameInput) ui.profileUsernameInput.value = profile.username;
  if (ui.profileCardLevel) ui.profileCardLevel.innerText = `LEVEL ${level}`;
  if (ui.profileCardXp) ui.profileCardXp.innerText = `${currentXp} / 500 XP`;
  if (ui.profileCardXpFill) ui.profileCardXpFill.style.width = `${xpPercent}%`;

  if (ui.profileStatsPlayed) ui.profileStatsPlayed.innerText = profile.played;
  if (ui.profileStatsWon) ui.profileStatsWon.innerText = profile.won;
  if (ui.profileStatsLost) ui.profileStatsLost.innerText = profile.lost;
  if (ui.profileStatsRuns) ui.profileStatsRuns.innerText = profile.runs;
  if (ui.profileStatsWickets) ui.profileStatsWickets.innerText = profile.wickets;

  const wr = profile.played > 0 ? Math.round((profile.won / profile.played) * 100) : 0;
  if (ui.profileStatsWinRatio) ui.profileStatsWinRatio.innerText = `${wr}%`;

  // Update profile avatar image and login/logout button states
  if (currentUser) {
    const avatarHtml = currentUser.photoURL 
      ? `<img src="${currentUser.photoURL}" alt="${profile.username}">` 
      : '👤';
    if (ui.menuProfAvatar) ui.menuProfAvatar.innerHTML = avatarHtml;
    if (ui.profileAvatarContainer) ui.profileAvatarContainer.innerHTML = avatarHtml;

    if (ui.profileLoginBtn) ui.profileLoginBtn.classList.add('hidden');
    if (ui.profileLogoutBtn) ui.profileLogoutBtn.classList.remove('hidden');
  } else {
    if (ui.menuProfAvatar) ui.menuProfAvatar.innerHTML = '👤';
    if (ui.profileAvatarContainer) ui.profileAvatarContainer.innerHTML = '👤';

    if (ui.profileLoginBtn) ui.profileLoginBtn.classList.remove('hidden');
    if (ui.profileLogoutBtn) ui.profileLogoutBtn.classList.add('hidden');
  }

  // Sync details over to the PS5 console dashboard UI if active
  if (typeof window.syncPlaySphereProfileDisplay === 'function') {
    window.syncPlaySphereProfileDisplay();
  }
}

export function setupProfileListeners() {
  const ui = window.ui;
  const profile = window.profile;

  if (ui.menuProfileBtn) {
    ui.menuProfileBtn.onclick = () => {
      if (ui.profileModal) ui.profileModal.classList.remove('hidden');
      CricketAudio.playHit(0.4);
      ensureFirebase(); // Load firebase in the background when the user opens the profile modal
    };
  }
  if (ui.profileCloseBtn) {
    ui.profileCloseBtn.onclick = () => {
      if (ui.profileModal) ui.profileModal.classList.add('hidden');
      CricketAudio.playHit(0.4);
    };
  }
  if (ui.profileUsernameInput) {
    ui.profileUsernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        profile.username = ui.profileUsernameInput.value.trim() || 'Gamer';
        saveProfile();
        ui.profileUsernameInput.blur();
        CricketAudio.playHit(0.4);
      }
    });
    ui.profileUsernameInput.addEventListener('blur', () => {
      profile.username = ui.profileUsernameInput.value.trim() || 'Gamer';
      saveProfile();
    });
  }

  if (ui.profileLoginBtn) {
    ui.profileLoginBtn.onclick = async () => {
      try {
        CricketAudio.playHit(0.4);
        const hasFirebase = await ensureFirebase();
        if (hasFirebase && auth && googleProvider) {
          await fb_signInWithPopup(auth, googleProvider);
        } else {
          alert("Could not load Firebase. Playing in offline/local guest mode.");
        }
      } catch (err) {
        console.error("Login failed:", err);
      }
    };
  }

  if (ui.profileLogoutBtn) {
    ui.profileLogoutBtn.onclick = async () => {
      try {
        CricketAudio.playHit(0.4);
        const hasFirebase = await ensureFirebase();
        if (hasFirebase && auth) {
          await fb_signOut(auth);
        }
      } catch (err) {
        console.error("Logout failed:", err);
      }
    };
  }
}

window.loadProfile = loadProfile;
window.saveProfile = saveProfile;
window.updateProfileUI = updateProfileUI;
window.setupProfileListeners = setupProfileListeners;
window.ensureFirebase = ensureFirebase;

window.friendsSearchUser = async (username) => {
  const loaded = await ensureFirebase();
  if (!loaded) return null;
  const q = window.fb_query(window.fb_collection(window.fb_db, "users"), window.fb_where("username", "==", username));
  const snap = await window.fb_getDocs(q);
  if (snap.empty) return null;
  let found = null;
  snap.forEach(docSnap => {
    found = { uid: docSnap.id, ...docSnap.data() };
  });
  return found;
};

window.friendsSendRequest = async (targetUid) => {
  const loaded = await ensureFirebase();
  if (!loaded || !window.currentUser) return;
  const myUid = window.currentUser.uid;
  const myRef = fb_doc(window.fb_db, "users", myUid);
  await window.fb_updateDoc(myRef, {
    friendRequestsSent: window.fb_arrayUnion(targetUid)
  });
  const targetRef = fb_doc(window.fb_db, "users", targetUid);
  await window.fb_updateDoc(targetRef, {
    friendRequestsReceived: window.fb_arrayUnion(myUid)
  });
};

window.friendsAcceptRequest = async (targetUid) => {
  const loaded = await ensureFirebase();
  if (!loaded || !window.currentUser) return;
  const myUid = window.currentUser.uid;
  const myRef = fb_doc(window.fb_db, "users", myUid);
  const targetRef = fb_doc(window.fb_db, "users", targetUid);
  await window.fb_updateDoc(myRef, {
    friends: window.fb_arrayUnion(targetUid),
    friendRequestsReceived: window.fb_arrayRemove(targetUid)
  });
  await window.fb_updateDoc(targetRef, {
    friends: window.fb_arrayUnion(myUid),
    friendRequestsSent: window.fb_arrayRemove(myUid)
  });
};

window.friendsDeclineRequest = async (targetUid) => {
  const loaded = await ensureFirebase();
  if (!loaded || !window.currentUser) return;
  const myUid = window.currentUser.uid;
  const myRef = fb_doc(window.fb_db, "users", myUid);
  const targetRef = fb_doc(window.fb_db, "users", targetUid);
  await window.fb_updateDoc(myRef, {
    friendRequestsReceived: window.fb_arrayRemove(targetUid)
  });
  await window.fb_updateDoc(targetRef, {
    friendRequestsSent: window.fb_arrayRemove(myUid)
  });
};

window.friendsLoadProfiles = async (uids) => {
  if (!uids || uids.length === 0) return [];
  const loaded = await ensureFirebase();
  if (!loaded) return [];
  const profiles = [];
  for (const uid of uids) {
    try {
      const userRef = fb_doc(window.fb_db, "users", uid);
      const snap = await fb_getDoc(userRef);
      if (snap.exists()) {
        profiles.push({ uid, ...snap.data() });
      }
    } catch (err) {
      console.error("Error loading profile for friend:", uid, err);
    }
  }
  return profiles;
};
