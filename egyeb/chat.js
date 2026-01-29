import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, 
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getDatabase, ref, set, push, onChildAdded 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
  getMessaging, getToken, onMessage, isSupported
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// 🔹 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAwRrAtHaNRh2DLwVkryA3wSf86h7aQCaI",
  authDomain: "konyv-93c63.firebaseapp.com",
  projectId: "konyv-93c63",
  storageBucket: "konyv-93c63.firebasestorage.app",
  messagingSenderId: "349471560585",
  appId: "1:349471560585:web:55c6e78499ebbca0540758",
  measurementId: "G-NF07N36ETJ"
};

// 🔔 VAPID public key
const VAPID_PUBLIC_KEY = "BJip5wBXXQAmPcTwRD66Nm66kWgNzK0nddIVpk4A7dFLZQt63q5c-WHFx2VO9DESU_DqiJAPZPPfmDBiNzB2Tdk";

// 🔹 Inicializálás
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Messaging / SW
let swRegistration = null;
let messaging = null;

// ---------------------------------------------
// Segédfüggvények
// ---------------------------------------------
function getUserName(user) {
  if (!user) return null;
  return user.displayName || user.email.split("@")[0];
}
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return; 
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
function highlightMentions(text) {
  if (!text) return "";
  const currentUser = auth.currentUser;
  const currentUserName = currentUser ? getUserName(currentUser) : null;
  return text.replace(/@(\w+)/g, (m, u) => {
    if (currentUser && u === currentUserName) {
      return `<mark class="mention" style="background-color:#4caf50;">${m}</mark>`;
    }
    return `<mark class="mention">${m}</mark>`;
  });
}

// Dummy content
const books = {
  "book1": "<h2>Az Első Könyv Tartalma</h2><p>Ez egy próba szöveg. A lap görgetésekor a progress bar mutatja, hol tartasz.</p>",
  "cbz1": "<h2>Képregény Olvasó (CBZ)</h2><p>Kérlek válassz egy részt az olvasó indításához!</p>",
};
const cbzFiles = [
  '/comics/Magik 001 (2025) (Digital) (Kileko-Empire).cbz',
];

// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  // DOM elemek
  const bookSelector = document.getElementById("bookSelector");
  const bookContent = document.getElementById("book-content");
  const progressBar = document.getElementById("progress-bar");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const authMessage = document.getElementById("auth-message");
  const authSection = document.getElementById("auth-section");
  const appSection = document.getElementById("app-section");
  const chatBox = document.getElementById("chat-box");
  const chatMessageInput = document.getElementById("chat-message");
  const sendMessageBtn = document.getElementById("send-message-btn");
  const loginBtn = document.getElementById("login-btn");
  const resetPasswordBtn = document.getElementById("reset-password-btn");

  // Service Worker regisztráció
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => { swRegistration = reg; })
      .catch(err => console.error('SW regisztráció hiba:', err));
  }

  // Auth események
  if (loginBtn) loginBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    authMessage.textContent = ""; 
    if (!email || !password) {
      authMessage.textContent = "Kérlek, töltsd ki az összes mezőt!";
      return;
    }
    signInWithEmailAndPassword(auth, email, password)
      .catch(() => {
        authMessage.textContent = "Hibás e-mail cím vagy jelszó!";
        if (resetPasswordBtn) resetPasswordBtn.style.display = "inline-block";
      });
  });

  if (resetPasswordBtn) resetPasswordBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    if (!email) return authMessage.textContent = "Add meg az email címed!";
    sendPasswordResetEmail(auth, email)
      .then(() => authMessage.textContent = "✅ Ellenőrizd az emailed!")
      .catch(err => authMessage.textContent = "❌ Hiba: " + err.message);
  });

  // ---------------- Notifications flow (csendes) ----------------
  async function saveTokenForUser(token) {
    const user = auth.currentUser;
    if (!user) return; // csendben kilép
    await set(ref(db, `fcmTokens/${user.uid}/${token}`), true);
  }

  let askedThisSession = false;

  async function ensureMessagingReady() {
    if (!swRegistration && 'serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }
    if (!messaging) messaging = getMessaging(app);
  }

  // mindenképp rákérdezünk (ha lehet), de NEM írunk ki toastot az állapotról
  async function maybePromptNotifications() {
    if (!('Notification' in window)) return;
    if (askedThisSession) return;
    askedThisSession = true;

    try {
      if (Notification.permission === 'granted') {
        try {
          if (await isSupported()) {
            await ensureMessagingReady();
            const token = await getToken(messaging, {
              vapidKey: VAPID_PUBLIC_KEY,
              serviceWorkerRegistration: swRegistration
            });
            if (token) await saveTokenForUser(token);
          }
        } catch (e) { console.warn("FCM token (granted) hiba:", e); }
        return;
      }

      if (Notification.permission === 'denied') {
        // csend
        return;
      }

      // default -> kérés (user-gesztushoz kötötten is hívjuk majd)
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        try {
          if (await isSupported()) {
            await ensureMessagingReady();
            const token = await getToken(messaging, {
              vapidKey: VAPID_PUBLIC_KEY,
              serviceWorkerRegistration: swRegistration
            });
            if (token) await saveTokenForUser(token);
          }
        } catch (e) { console.warn("FCM token (request után) hiba:", e); }
      }
      // denied/default -> csend
    } catch (e) {
      console.warn("Permission prompt hiba:", e);
    }
  }

  // Előtér push (onMessage) – ez marad toast, mert tartalom
  (async () => {
    try {
      if (await isSupported()) {
        messaging = messaging || getMessaging(app);
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || "Új üzenet";
          const body  = payload.notification?.body  || "";
          showToast(`${title}: ${body}`);

          if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
            try { new Notification(title, { body, icon: "/icon-192.png" }); } catch {}
          }
        });
      }
    } catch {}
  })();

  // Chat küldés
  async function sendMessage() {
    const user = auth.currentUser;
    if (!user) { showToast("Előbb jelentkezz be!"); return; }

    // első üzenetküldéskor is kérdezhet (user-gesztus), de csendben
    if (window.Notification && Notification.permission === 'default') {
      await maybePromptNotifications();
    }

    const text = chatMessageInput.value.trim();
    if (!text) return;

    const mentionMatch = text.match(/@(\w+)/g); 
    let mentions = mentionMatch ? mentionMatch.map(m => m.slice(1)) : [];

    push(ref(db, "chat"), {
      uid: user.uid,
      user: getUserName(user),
      text,
      mentions,
      time: new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    });

    chatMessageInput.value = "";
  }
  if (sendMessageBtn) sendMessageBtn.addEventListener("click", sendMessage);
  if (chatMessageInput) chatMessageInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); 
      sendMessage();
    }
  });

  // Realtime chat render
  const chatRef = ref(db, "chat");
  onChildAdded(chatRef, snapshot => {
    const msg = snapshot.val();
    const currentUser = auth.currentUser;
    const currentUserName = currentUser ? getUserName(currentUser) : null;
    const senderName = msg.user || "Névtelen";
    
    const div = document.createElement("div");
    div.classList.add("chat-msg");
    const highlightedText = highlightMentions(msg.text);
    
    if (currentUser && senderName === currentUserName) {
      div.classList.add("self");
      div.innerHTML = `${highlightedText} <br><small class="chat-meta">${msg.time}</small>`;
    } else {
      div.classList.add("other");
      div.innerHTML = `<strong>${senderName}</strong>: ${highlightedText} <br><small class="chat-meta">${msg.time}</small>`;
    }

    if (chatBox) chatBox.appendChild(div);
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

    if (currentUser && msg.mentions && msg.mentions.includes(currentUserName)) {
      showToast(`✅ Téged említettek: ${msg.text}`);
    }

    if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
      if (!currentUser || senderName !== currentUserName) {
        try { new Notification("Új üzenet", { body: `${senderName}: ${msg.text}`, icon: "img/icon-192.png" }); } catch {}
      }
    }
  });

  // Auth állapot + automatikus kérdezés (csendben)
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (authSection) authSection.style.display = "none";
      if (appSection) appSection.style.display = "flex";
      if (sendMessageBtn) sendMessageBtn.disabled = false;
      if (chatMessageInput) { chatMessageInput.disabled = false; chatMessageInput.placeholder = "Írj üzenetet..."; }

      // Ha default/granted, intézzük csendben
      if (window.Notification) {
        if (Notification.permission === 'default') {
          setTimeout(() => { maybePromptNotifications(); }, 400);
        } else if (Notification.permission === 'granted') {
          try {
            if (await isSupported()) {
              await ensureMessagingReady();
              const token = await getToken(messaging, {
                vapidKey: VAPID_PUBLIC_KEY,
                serviceWorkerRegistration: swRegistration
              });
              if (token) await saveTokenForUser(token);
            }
          } catch (e) { console.warn("Token frissítés hiba:", e); }
        }
      }
    } else {
      if (authSection) authSection.style.display = "flex";
      if (appSection) appSection.style.display = "none";
      if (sendMessageBtn) sendMessageBtn.disabled = true;
      if (chatMessageInput) { chatMessageInput.disabled = true; chatMessageInput.placeholder = "Jelentkezz be a küldéshez!"; }
    }
  });

  // Progress bar
  function updateProgressBar() {
    const scrollTop = window.scrollY;
    const docHeight = (bookContent ? bookContent.scrollHeight : 0) - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = scrollPercent + "%";
  }
  if (window.addEventListener) window.addEventListener("scroll", updateProgressBar);
  if (bookSelector) bookSelector.addEventListener("change", e => {
    const key = e.target.value;
    const body = document.body;
    if (key === "cbz1") { body.classList.add("cbz-mode"); return; }
    body.classList.remove("cbz-mode");
    if (bookContent) bookContent.innerHTML = books[key] || "<p>Ez a könyv még nem elérhető.</p>";
    updateProgressBar();
  });

}); // DOMContentLoaded vége

// UI polish
(function enhanceInput(){
  const ta = document.getElementById("chat-message");
  const btn = document.getElementById("send-message-btn");
  if (!ta || !btn) return;

  const autoresize = () => {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  };
  ta.addEventListener("input", autoresize);
  window.addEventListener("load", autoresize);

  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      btn.click();
    }
  });

  btn.closest("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    btn.click();
  });
})();
