// ============================================
// BOMBASZ.HU - Végleges Auth & Sync
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    onDisconnect,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// TODO: BIZTONSÁGI PROBLÉMA - Admin emailek hardkódolva a kliensoldali kódban!
// Bárki megnézheti a forráskódot és láthatja az admin email címeket.
// Helyette Firebase Custom Claims-t kellene használni (szerveren beállítva).
const ADMIN_EMAILS = [
    "bartaadikonyv@gmail.com",
    "balazs.hajdu00@gmail.com",
    "hajdub@kkszki.hu",
    "adam070702@gmail.com"
];

const firebaseConfig = {
    apiKey: "AIzaSyAwRrAtHaNRh2DLwVkryA3wSf86h7aQCaI",
    authDomain: "konyv-93c63.firebaseapp.com",
    databaseURL: "https://konyv-93c63-default-rtdb.firebaseio.com",
    projectId: "konyv-93c63",
    storageBucket: "konyv-93c63.firebasestorage.app",
    messagingSenderId: "308577632498",
    // TODO: Az appId placeholder érték ("yourappid") - cseréld ki a valódi Firebase appId-ra!
    appId: "1:308577632498:web:yourappid"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// TODO: A setPersistence visszatérési értéke (Promise) nincs kezelve - await-tel vagy .catch()-csel kellene
setPersistence(auth, browserLocalPersistence);

// Globális kijelentkezés
window.logoutUser = async function() {
    if (auth.currentUser) {
        await set(ref(db, 'status/' + auth.currentUser.uid), null);
    }
    await signOut(auth);
    window.location.href = 'index.html';   // vagy 'login.html' ha szigorúbb akarsz lenni
};

// ────────────────────────────────────────────────
//          Auth állapot figyelése + redirect logika
// ────────────────────────────────────────────────

onAuthStateChanged(auth, (user) => {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    const publicPages = ['index.html', 'login.html', 'hamarosan.html'];

    if (user) {
        // 1. User adat + online státusz mentése
        const userData = {
            username: user.displayName || user.email.split('@')[0],
            email: user.email,
            lastSeen: serverTimestamp()
        };
        set(ref(db, 'users/' + user.uid), userData);

        const statusRef = ref(db, 'status/' + user.uid);
        set(statusRef, { online: true });
        onDisconnect(statusRef).remove();

        // 2. Redirect logika – ha van mentett céloldal, oda megyünk
        const savedRedirect = sessionStorage.getItem('redirectAfterLogin');

        if (savedRedirect) {
            sessionStorage.removeItem('redirectAfterLogin');
            if (savedRedirect !== currentPath && savedRedirect !== window.location.href) {
                window.location.href = savedRedirect;
                return;   // FONTOS: ne fusson tovább a kód
            }
        }

        // Ha nincs mentett redirect → marad az aktuális oldal (vagy index)
        if (typeof window.showUserUI === 'function') {
            const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
            window.showUserUI(user, isAdmin);
        }
    }
    else {
        // Nincs bejelentkezve
        if (!publicPages.includes(currentPage) && currentPage !== 'admin.html') {
            // Elmentjük, hova akart menni
            sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
            window.location.href = 'login.html';
        }
        else {
            if (typeof window.showGuestUI === 'function') {
                window.showGuestUI();
            }
        }
    }
});