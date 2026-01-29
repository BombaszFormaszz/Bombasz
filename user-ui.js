// ============================================
// BOMBASZ User UI - Bejelentkezési jelző
// ============================================

(function() {
    function waitForAuth(callback, maxAttempts = 50) {
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            if (window.firebaseAuth || attempts >= maxAttempts) {
                clearInterval(check);
                if (window.firebaseAuth) callback();
            }
        }, 100);
    }

    // MÓDOSÍTOTT: Most már a teljes user objektumot fogadja
    window.showUserUI = function(user, isAdmin) {
        if (document.getElementById('bombasz-user-bar')) return;

        // Felhasználónév logika: Display Name VAGY Email eleje
        const userName = user.displayName && user.displayName !== "" 
                         ? user.displayName 
                         : user.email.split('@')[0];
        
        const initial = userName.charAt(0).toUpperCase();

        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Poppins:wght@400;600&display=swap');
            #bombasz-user-bar {
                position: fixed; top: 0; left: 0; right: 0; height: 44px;
                background: #000; border-bottom: 1px solid #333;
                display: flex; align-items: center; justify-content: space-between;
                padding: 0 16px; z-index: 99999; font-family: 'Poppins', sans-serif;
            }
            #bombasz-user-bar .user-info { display: flex; align-items: center; gap: 10px; color: #fff; }
            #bombasz-user-bar .user-avatar {
                width: 28px; height: 28px; background: #fff; color: #000;
                clip-path: polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%);
                display: flex; align-items: center; justify-content: center;
                font-weight: 700; font-family: 'Orbitron', sans-serif;
            }
            #bombasz-user-bar .user-display-name { color: #fff; font-size: 0.85rem; font-weight: 600; }
            #bombasz-user-bar .admin-badge {
                background: #fff; color: #000; padding: 2px 8px; font-size: 0.6rem;
                font-weight: 700; text-transform: uppercase; font-family: 'Orbitron', sans-serif;
                clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%);
            }
            #bombasz-user-bar .bar-actions { display: flex; align-items: center; gap: 10px; }
            #bombasz-user-bar .logout-btn, #bombasz-user-bar .admin-link {
                background: transparent; border: 1px solid #444; color: #fff;
                padding: 4px 10px; font-size: 0.7rem; cursor: pointer;
                text-decoration: none; text-transform: uppercase; transition: 0.2s;
            }
            #bombasz-user-bar .logout-btn:hover, #bombasz-user-bar .admin-link:hover { background: #fff; color: #000; }
            body.has-user-bar { padding-top: 44px !important; }
            @media (max-width: 600px) { .logout-btn span, .admin-link span { display: none; } }
        `;
        document.head.appendChild(style);

        const bar = document.createElement('div');
        bar.id = 'bombasz-user-bar';
        bar.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <span class="user-display-name">${userName}</span>
                ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
            </div>
            <div class="bar-actions">
                ${isAdmin ? '<a href="admin.html" class="admin-link"><span>⚙ Admin</span></a>' : ''}
                <button class="logout-btn" onclick="logoutUser()">
                    <span>Kilépés</span>
                </button>
            </div>
        `;
        document.body.insertBefore(bar, document.body.firstChild);
        document.body.classList.add('has-user-bar');
    };

    window.showGuestUI = function() {
        if (document.getElementById('bombasz-user-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'bombasz-user-bar';
        bar.style.cssText = "position:fixed; top:0; width:100%; height:44px; background:#000; border-bottom:1px solid #333; display:flex; align-items:center; justify-content:space-between; padding:0 16px; z-index:99999;";
        bar.innerHTML = `
            <div style="color:#666; font-size:0.8rem;">Vendég mód</div>
            <a href="login.html" style="background:#fff; color:#000; padding:5px 15px; text-decoration:none; font-size:0.75rem; font-weight:bold; clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%);">BEJELENTKEZÉS</a>
        `;
        document.body.insertBefore(bar, document.body.firstChild);
        document.body.classList.add('has-user-bar');
    };
})();