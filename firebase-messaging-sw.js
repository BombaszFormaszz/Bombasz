// firebase-messaging-sw.js
// Service Worker a push értesítésekhez

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAwRrAtHaNRh2DLwVkryA3wSf86h7aQCaI",
    authDomain: "konyv-93c63.firebaseapp.com",
    databaseURL: "https://konyv-93c63-default-rtdb.firebaseio.com",
    projectId: "konyv-93c63",
    storageBucket: "konyv-93c63.firebasestorage.app",
    messagingSenderId: "308577632498",
    appId: "1:308577632498:web:55c6e78499ebbca0540758"
});

const messaging = firebase.messaging();

// Háttér push érkezésekor (amikor az oldal nincs nyitva vagy fókuszban)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'BOMBASZ';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Új üzenet érkezett',
        icon: '/img/icon-192.png',
        badge: '/img/icon-192.png',
        tag: 'bombasz-message-' + Date.now(),
        renotify: true,
        requireInteraction: false,
        data: payload.data || {},
        actions: [
            { action: 'open', title: 'Megnyitás' },
            { action: 'close', title: 'Bezárás' }
        ],
        vibrate: [200, 100, 200]
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification kattintás kezelése
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    // Megnyitjuk vagy fókuszba hozzuk az alkalmazást
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Ha már van nyitott ablak, fókuszáljuk
            for (const client of clientList) {
                if (client.url.includes('social.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Ha nincs nyitott ablak, nyissunk újat
            if (clients.openWindow) {
                return clients.openWindow('/social.html');
            }
        })
    );
});

// Service Worker aktiválás
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activated');
    event.waitUntil(clients.claim());
});

// Service Worker telepítés
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installed');
    self.skipWaiting();
});
