        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getDatabase, ref, set, push, onValue, remove, serverTimestamp, onDisconnect, update, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAwRrAtHaNRh2DLwVkryA3wSf86h7aQCaI",
            authDomain: "konyv-93c63.firebaseapp.com",
            databaseURL: "https://konyv-93c63-default-rtdb.firebaseio.com",
            projectId: "konyv-93c63",
            storageBucket: "konyv-93c63.firebasestorage.app",
            messagingSenderId: "308577632498",
            appId: "1:308577632498:web:yourappid"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app);

        let currentUid, currentUsername, activeChatId;
        const appStartTime = Date.now(); 
        
        let currentChatFriendUid = null;
        let currentChatOriginalName = null;
        let unreadStates = {}; 

        // ========================================
        // NOTIFICATION SYSTEM (Böngésző API)
        // ========================================
        
        function updateNotifButton() {
            const btn = document.getElementById('notif-btn');
            if (!btn) return;
            
            if (!('Notification' in window)) {
                btn.innerHTML = '<i class="fa-solid fa-bell-slash"></i><span>Nem támogatott</span>';
                btn.className = 'btn-notif unsupported';
                btn.disabled = true;
                return;
            }
            
            const perm = Notification.permission;
            if (perm === 'granted') {
                btn.innerHTML = '<i class="fa-solid fa-bell"></i><span>Bekapcsolva</span>';
                btn.className = 'btn-notif enabled';
            } else if (perm === 'denied') {
                btn.innerHTML = '<i class="fa-solid fa-bell-slash"></i><span>Tiltva</span>';
                btn.className = 'btn-notif denied';
                btn.title = 'Engedélyezd a böngésző beállításaiban';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-bell"></i><span>Értesítések</span>';
                btn.className = 'btn-notif';
            }
        }
        
        window.requestNotificationPermission = async function() {
            if (!('Notification' in window)) {
                showToast('A böngésződ nem támogatja az értesítéseket');
                return;
            }
            
            if (Notification.permission === 'denied') {
                showToast('Értesítések tiltva! Engedélyezd a böngésző beállításaiban.');
                return;
            }
            
            if (Notification.permission === 'granted') {
                showToast('Értesítések már engedélyezve!');
                return;
            }
            
            const permission = await Notification.requestPermission();
            updateNotifButton();
            
            if (permission === 'granted') {
                showToast('Értesítések bekapcsolva!');
            } else {
                showToast('Értesítések elutasítva');
            }
        };
        
        // Már értesített üzenetek (dupla értesítés elkerülése)
        let notifiedMessages = new Set();
        
        function sendNotification(title, body, msgKey) {
            // Ha már értesítettünk erről, skip
            if (msgKey && notifiedMessages.has(msgKey)) return;
            if (msgKey) notifiedMessages.add(msgKey);
            
            if (Notification.permission === 'granted') {
                try {
                    console.log('🔔 Értesítés küldése:', title, body);
                    const notif = new Notification(title, {
                        body: body,
                        icon: 'img/icon-192.png',
                        tag: 'bombasz-' + (msgKey || Date.now()),
                        renotify: true
                    });
                    
                    notif.onclick = () => {
                        window.focus();
                        notif.close();
                    };
                    
                    setTimeout(() => notif.close(), 5000);
                } catch (e) {
                    console.log('Notification error:', e);
                }
            } else {
                console.log('❌ Notification permission:', Notification.permission);
            }
        }

        // ========================================
        // MODALS
        // ========================================
        
        function showConfirm(text, onConfirm) {
            const modal = document.getElementById('confirm-modal');
            document.getElementById('modal-text').innerText = text;
            modal.classList.add('open');
            document.getElementById('modal-confirm-btn').onclick = () => { modal.classList.remove('open'); onConfirm(); };
            document.getElementById('modal-cancel-btn').onclick = () => { modal.classList.remove('open'); };
        }

        function showInput(title, placeholder, onConfirm) {
            const modal = document.getElementById('input-modal');
            const input = document.getElementById('input-modal-field');
            document.getElementById('input-modal-title').innerText = title;
            input.value = "";
            input.placeholder = placeholder;
            modal.classList.add('open');
            input.focus();

            document.getElementById('input-modal-confirm').onclick = () => {
                const val = input.value.trim();
                modal.classList.remove('open');
                if(val) onConfirm(val);
            };
            document.getElementById('input-modal-cancel').onclick = () => { modal.classList.remove('open'); };
        }

        function showMessageOptions(msgId, text, isMine) {
            const modal = document.getElementById('msg-actions-modal');
            const btnCopy = document.getElementById('msg-act-copy');
            const btnDelete = document.getElementById('msg-act-delete');
            const btnCancel = document.getElementById('msg-act-cancel');

            btnDelete.style.display = isMine ? 'block' : 'none';
            modal.classList.add('open');

            btnCopy.onclick = () => {
                navigator.clipboard.writeText(text).then(() => showToast("Másolva!"));
                modal.classList.remove('open');
            };

            if (isMine) {
                btnDelete.onclick = () => {
                    modal.classList.remove('open');
                    deleteMessage(msgId);
                };
            }
            btnCancel.onclick = () => modal.classList.remove('open');
        }

        function addLongPressEvent(element, callback) {
            let timer;
            const start = () => { timer = setTimeout(callback, 600); };
            const cancel = () => { clearTimeout(timer); };
            element.addEventListener('touchstart', start);
            element.addEventListener('touchend', cancel);
            element.addEventListener('touchmove', cancel);
            element.addEventListener('mousedown', start);
            element.addEventListener('mouseup', cancel);
            element.addEventListener('mouseleave', cancel);
        }

        // --- KERESÉS ---
        const searchInput = document.getElementById('user-search');
        const searchResults = document.getElementById('search-results');
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.innerHTML = '';
            }
        });

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            const friendCards = document.querySelectorAll('#friends-list .user-card');
            friendCards.forEach(card => {
                const name = card.getAttribute('data-name')?.toLowerCase() || '';
                card.style.display = name.includes(val) ? 'flex' : 'none';
            });

            if (val.length < 2) { searchResults.innerHTML = ''; return; }
            onValue(ref(db, 'users'), (snap) => {
                const users = snap.val(); let h = '';
                for (let uid in users) {
                    const n = users[uid].username || users[uid].email.split('@')[0];
                    if (uid !== currentUid && n.toLowerCase().includes(val)) {
                        h += `<div class="user-card" style="border:1px dashed #444"><span>${n}</span><button class="btn-action" onclick="sendRequest('${uid}', '${n}')">JELÖLÉS</button></div>`;
                    }
                }
                searchResults.innerHTML = h;
            }, { onlyOnce: true });
        });

        // --- AUTH UI ---
        const tabs = document.querySelectorAll('.auth-tab'); 
        const forms = document.querySelectorAll('.auth-form');
        function showAuthMessage(text, type) { const msg = document.getElementById('auth-message'); msg.textContent = text; msg.className = `message ${type}`; }
        function hideAuthMessage() { document.getElementById('auth-message').className = 'message'; }
        tabs.forEach(tab => { tab.addEventListener('click', () => { tabs.forEach(t => t.classList.remove('active')); forms.forEach(f => f.classList.remove('active')); tab.classList.add('active'); document.getElementById(`${tab.dataset.tab}-form`).classList.add('active'); hideAuthMessage(); }); });
        window.showToast = function(msg) { const c = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg; c.appendChild(t); setTimeout(() => t.remove(), 2500); };

        onAuthStateChanged(auth, (user) => {
            if (user) {
                document.getElementById('login-view').style.display = 'none';
                document.getElementById('app-view').style.display = 'flex';
                
                currentUid = user.uid;
                updateNotifButton();
                
                onValue(ref(db, 'users/' + currentUid), (snap) => {
                    const data = snap.val();
                    currentUsername = (data && data.username) ? data.username : (user.displayName || user.email.split('@')[0]);
                    document.getElementById('header-user-info').innerHTML = `<div class="profile-icon">${currentUsername.charAt(0).toUpperCase()}</div><span style="font-size:0.75rem; margin-left:8px;"><b>${currentUsername}</b></span>`;
                }, { onlyOnce: true });
                
                set(ref(db, `status/${currentUid}`), { state: 'online', last_changed: serverTimestamp() });
                onDisconnect(ref(db, `status/${currentUid}`)).set({ state: 'offline', last_changed: serverTimestamp() });
                loadRequests(); 
                loadFriends();
            } else {
                document.getElementById('login-view').style.display = 'flex';
                document.getElementById('app-view').style.display = 'none';
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden && currentChatFriendUid) {
                set(ref(db, `chat_meta/${currentUid}/${currentChatFriendUid}/lastSeen`), serverTimestamp());
                unreadStates[currentChatFriendUid] = false;
                const badge = document.getElementById(`unread-${currentChatFriendUid}`);
                if(badge) badge.style.display = 'none';
            }
        });

        document.getElementById('login-form').addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            const email = document.getElementById('login-email').value; 
            const pass = document.getElementById('login-password').value; 
            const btn = e.target.querySelector('.submit-btn'); 
            btn.disabled=true; btn.innerHTML='...'; 
            try { 
                await setPersistence(auth, document.getElementById('remember-me').checked ? browserLocalPersistence : browserSessionPersistence); 
                await signInWithEmailAndPassword(auth, email, pass); 
            } catch(err) { 
                showAuthMessage("Hiba: " + err.message, 'error'); 
                btn.disabled=false; btn.textContent='Belépés'; 
            } 
        });
        
        document.getElementById('register-form').addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            const u = document.getElementById('reg-username').value; 
            const em = document.getElementById('register-email').value; 
            const p = document.getElementById('register-password').value; 
            if(p!==document.getElementById('register-password2').value){
                showAuthMessage("Nem egyezik a jelszó",'error');
                return;
            } 
            try { 
                const uc = await createUserWithEmailAndPassword(auth, em, p); 
                await updateProfile(uc.user, {displayName:u}); 
                await set(ref(db,'users/'+uc.user.uid),{username:u,email:em}); 
            } catch(err) { 
                showAuthMessage("Hiba: "+err.message,'error'); 
            } 
        });
        
        document.getElementById('forgot-password').addEventListener('click', async(e)=>{
            e.preventDefault(); 
            try{
                await sendPasswordResetEmail(auth,document.getElementById('login-email').value);
                showAuthMessage("Email elküldve",'success');
            }catch(e){
                showAuthMessage("Add meg az emailt!",'error');
            }
        });
        
        window.logoutUser = function() { 
            if(currentUid) set(ref(db, `status/${currentUid}`), { state: 'offline', last_changed: serverTimestamp() }); 
            signOut(auth); 
        };
        
        window.openChatUI = function() { if (window.innerWidth <= 768) document.getElementById('body-tag').classList.add('chat-open'); };
        window.closeChat = function() { document.getElementById('body-tag').classList.remove('chat-open'); };

        window.sendRequest = function(uid, name) { 
            set(ref(db, `friend_requests/${uid}/${currentUid}`), { fromName: currentUsername, timestamp: serverTimestamp() })
            .then(() => { 
                showToast("KÉRÉS ELKÜLDVE!"); 
                searchResults.innerHTML = ''; 
                searchInput.value = ''; 
            }); 
        };
        
        function loadRequests() { 
            onValue(ref(db, `friend_requests/${currentUid}`), (snap) => { 
                const reqs = snap.val(); 
                const cont = document.getElementById('requests-list'); 
                const badge = document.getElementById('req-count'); 
                cont.innerHTML = ''; 
                if (!reqs) { badge.style.display='none'; return; } 
                badge.style.display='inline'; 
                for (let id in reqs) { 
                    cont.innerHTML += `<div class="user-card"><span>${reqs[id].fromName}</span><button class="btn-action" onclick="acceptFriend('${id}', '${reqs[id].fromName}')">ELFOGAD</button></div>`; 
                } 
            }); 
        }
        
        window.acceptFriend = function(uid, name) { 
            set(ref(db, `friends/${currentUid}/${uid}`), { username: name }); 
            set(ref(db, `friends/${uid}/${currentUid}`), { username: currentUsername }); 
            remove(ref(db, `friend_requests/${currentUid}/${uid}`)); 
        };

        // --- BARÁT LISTA ---
        function loadFriends() {
            onValue(ref(db, `friends/${currentUid}`), (snap) => {
                const friends = snap.val(); 
                const cont = document.getElementById('friends-list');
                cont.innerHTML = ''; 
                if (!friends) return;
                
                for (let uid in friends) {
                    const friendData = friends[uid];
                    const displayName = friendData.nickname || friendData.username;
                    
                    const card = document.createElement('div'); 
                    card.id = `f-${uid}`; 
                    card.className = 'user-card';
                    card.setAttribute('data-name', displayName + ' ' + friendData.username);
                    cont.appendChild(card);

                    if (unreadStates[uid] === undefined) unreadStates[uid] = false;

                    onValue(ref(db, `status/${uid}`), (sSnap) => {
                        const online = sSnap.val()?.state === 'online';
                        const dot = online ? '#4bff4b' : '#444';
                        updateFriendCardContent(uid, displayName, dot);
                    });

                    // Olvasatlan üzenetek figyelése - VALÓS IDŐBEN
                    const chatId = [currentUid, uid].sort().join('_');
                    onValue(query(ref(db, `chats/${chatId}`), limitToLast(1)), (msgSnap) => {
                        const msgs = msgSnap.val();
                        if (msgs) {
                            const lastMsgKey = Object.keys(msgs)[0];
                            const lastMsg = msgs[lastMsgKey];
                            const isIncoming = lastMsg.senderId !== currentUid;
                            const isChatOpen = (currentChatFriendUid === uid) && !document.hidden;
                            
                            // Értesítés küldése - ha bejövő üzenet és nem ez a chat van nyitva
                            if (isIncoming && lastMsg.timestamp > appStartTime && !isChatOpen) {
                                sendNotification(displayName, lastMsg.text, lastMsgKey);
                            }
                            
                            // Olvasatlan státusz frissítése
                            onValue(ref(db, `chat_meta/${currentUid}/${uid}/lastSeen`), (seenSnap) => {
                                const lastSeen = seenSnap.val() || 0;
                                let isUnread = (lastMsg.timestamp > lastSeen) && isIncoming;

                                if (isChatOpen) {
                                    isUnread = false;
                                    if(lastMsg.timestamp > lastSeen) {
                                        set(ref(db, `chat_meta/${currentUid}/${uid}/lastSeen`), serverTimestamp());
                                    }
                                }

                                unreadStates[uid] = isUnread;

                                const indicator = document.getElementById(`unread-${uid}`);
                                if(indicator) {
                                    indicator.style.display = isUnread ? 'inline-block' : 'none';
                                }
                            }, { onlyOnce: true });
                        }
                    });
                }
            });
        }

        function updateFriendCardContent(uid, name, statusColor) {
            const el = document.getElementById(`f-${uid}`);
            if(el) {
                const isUnread = unreadStates[uid] === true;
                el.innerHTML = `
                    <div class="user-info-click" onclick="openChat('${uid}', '${name}'); openChatUI();">
                        <div style="display:flex; align-items:center;">
                            <span id="unread-${uid}" class="unread-badge" style="display:${isUnread ? 'inline-block' : 'none'};"></span>
                            <b>${name}</b>
                        </div>
                        <span style="width:7px; height:7px; border-radius:50%; background:${statusColor}; margin-right:10px;"></span>
                    </div>
                `;
            }
        }

        // --- CHAT ---
        window.openChat = function(uid, name) {
            document.getElementById('active-chat-user').innerText = name.toUpperCase();
            
            currentChatFriendUid = uid;
            currentChatOriginalName = name; 

            if (!document.hidden) {
                unreadStates[uid] = false;
                const badge = document.getElementById(`unread-${uid}`);
                if(badge) badge.style.display = 'none';
                set(ref(db, `chat_meta/${currentUid}/${uid}/lastSeen`), serverTimestamp());
            }

            document.getElementById('chat-actions').style.display = 'flex';
            document.getElementById('delete-friend-btn').onclick = () => removeCurrentFriend(name);
            document.getElementById('rename-friend-btn').onclick = () => changeNickname();

            const ids = [currentUid, uid].sort(); 
            activeChatId = ids[0] + "_" + ids[1];
            
            onValue(query(ref(db, `chats/${activeChatId}`), limitToLast(50)), (snap) => {
                const cont = document.getElementById('chat-messages'); 
                const msgs = snap.val();
                let html = '';
                const toAttach = [];

                if (msgs) {
                    const keys = Object.keys(msgs);
                    const lastMsg = msgs[keys[keys.length - 1]];
                    if(lastMsg && lastMsg.senderId !== currentUid && !document.hidden) {
                        set(ref(db, `chat_meta/${currentUid}/${uid}/lastSeen`), serverTimestamp());
                    }

                    for (let id of keys) {
                        const m = msgs[id];
                        const side = m.senderId === currentUid ? 'sent' : 'received';
                        const date = new Date(m.timestamp);
                        const timeStr = date.toLocaleString('hu-HU', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
                        const isMine = side === 'sent';

                        html += `
                            <div class="message-wrapper ${side}">
                                <div id="msg-${id}" class="message-bubble ${side} noselect" title="${timeStr}">
                                    ${escapeHtml(m.text)}
                                </div>
                                <div class="msg-options-pc">
                                    <i class="fa-solid fa-copy btn-msg-icon" onclick="copyText(\`${m.text.replace(/`/g, '\\`')}\`)" title="Másolás"></i>
                                    ${isMine ? `<i class="fa-solid fa-trash btn-msg-icon delete" onclick="deleteMessage('${id}')" title="Törlés"></i>` : ''}
                                </div>
                            </div>
                        `;
                        toAttach.push({ id, text: m.text, isMine });
                    }
                }
                
                cont.innerHTML = html;
                toAttach.forEach(item => {
                    const el = document.getElementById(`msg-${item.id}`);
                    if (el) addLongPressEvent(el, () => showMessageOptions(item.id, item.text, item.isMine));
                });
                cont.scrollTop = cont.scrollHeight;
            });
        };

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        window.copyText = function(text) {
            navigator.clipboard.writeText(text).then(() => showToast("Másolva!"));
        };

        window.changeNickname = function() {
            if (!currentChatFriendUid) return;
            showInput("Becenév beállítása", "Új név...", (newNick) => {
                update(ref(db, `friends/${currentUid}/${currentChatFriendUid}`), { nickname: newNick })
                .then(() => {
                    showToast("Becenév mentve!");
                    document.getElementById('active-chat-user').innerText = newNick.toUpperCase();
                });
            });
        };

        window.deleteMessage = function(msgId) {
            if (!activeChatId) return;
            showConfirm("Törlöd az üzenetet?", () => {
                remove(ref(db, `chats/${activeChatId}/${msgId}`)).then(() => showToast("Törölve"));
            });
        };

        window.removeCurrentFriend = function(name) {
            if (!currentChatFriendUid) return;
            showConfirm(`Törlöd ${name}-t a barátok közül?`, () => {
                remove(ref(db, `friends/${currentUid}/${currentChatFriendUid}`));
                remove(ref(db, `friends/${currentChatFriendUid}/${currentUid}`));
                showToast("Törölve");
                document.getElementById('chat-messages').innerHTML = '';
                document.getElementById('active-chat-user').innerText = 'VÁLASSZ VALAKIT';
                document.getElementById('chat-actions').style.display = 'none';
                activeChatId = null;
                currentChatFriendUid = null;
                if (window.innerWidth <= 768) closeChat();
            });
        };

        const sendMsg = () => {
            const i = document.getElementById('msg-input');
            if (!i.value.trim() || !activeChatId) return;
            push(ref(db, `chats/${activeChatId}`), { senderId: currentUid, text: i.value.trim(), timestamp: serverTimestamp() });
            i.value = '';
        };
        document.getElementById('send-btn').onclick = sendMsg;
        document.getElementById('msg-input').onkeypress = (e) => { if(e.key==='Enter') sendMsg(); };