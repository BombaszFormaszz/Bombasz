// ==========================================
// BOMBASZ - PERFECT Homepage Rebuild v15
// OLDAL szétrobban -> gömb TÖKÉLETESEN összeáll
// ==========================================

(function() {
    
    const cameFromHome = sessionStorage.getItem('stargate-entry') || sessionStorage.getItem('came-from-home');
    const isMobile = window.innerWidth < 768;
    
    // === VISSZA GOMB ===
    // Tools oldalak ahol MINDIG kell a gomb
    const currentPage = window.location.pathname.split('/').pop() || '';
    const toolsPages = ['tools.html','countdown.html','playlist.html','paste.html','files.html','soundboard.html','wallpapers.html','tracker.html'];
    const isToolsPage = toolsPages.includes(currentPage);

    function addBackButton() {
        if (!cameFromHome && !isToolsPage) return;
        if (document.getElementById('stargate-back-btn')) return;
        
        sessionStorage.setItem('came-from-home', 'true');

        // Ha van user bar, lejjebb kell a gomb
        const hasBar = document.body.classList.contains('has-user-bar') || document.getElementById('bombasz-user-bar');
        const topOffset = hasBar ? 54 : (isMobile ? 15 : 20);
        
        const btn = document.createElement('button');
        btn.id = 'stargate-back-btn';
        btn.innerHTML = 'FŐOLDAL';
        
        if (isMobile) {
            btn.style.cssText = `
                position:fixed;top:${topOffset}px;left:20px;
                font-family:'Orbitron',sans-serif;font-size:9px;font-weight:700;
                letter-spacing:1px;padding:8px 14px;
                border:1px solid #fff;background:black;color:#fff;
                cursor:pointer;z-index:9999;transition:all 0.3s ease;
            `;
        } else {
            btn.style.cssText = `
                position:fixed;top:${topOffset}px;left:40px;
                font-family:'Orbitron',sans-serif;font-size:10px;font-weight:700;
                letter-spacing:2px;padding:10px 20px;
                border:1px solid #fff;background:black;color:#fff;
                cursor:pointer;z-index:9999;transition:all 0.3s ease;
            `;
        }
        
        btn.onmouseenter = () => { btn.style.background='#fff'; btn.style.color='#000'; };
        btn.onmouseleave = () => { btn.style.background='black'; btn.style.color='#fff'; };
        btn.onclick = (e) => {
            e.preventDefault();
            sessionStorage.removeItem('came-from-home');
            playRebuildAnimation('index.html');
        };
        
        document.body.appendChild(btn);
    }
    
    // === ICOSAHEDRON ===
    function generateIcosahedron(subdivisions) {
        const t = (1 + Math.sqrt(5)) / 2;
        
        let vertices = [
            norm([-1,t,0]), norm([1,t,0]), norm([-1,-t,0]), norm([1,-t,0]),
            norm([0,-1,t]), norm([0,1,t]), norm([0,-1,-t]), norm([0,1,-t]),
            norm([t,0,-1]), norm([t,0,1]), norm([-t,0,-1]), norm([-t,0,1])
        ];
        
        let faces = [
            [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
            [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
            [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
            [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
        ];
        
        for (let s = 0; s < subdivisions; s++) {
            const newFaces = [];
            const midCache = {};
            faces.forEach(f => {
                const ab = getMid(vertices, midCache, f[0], f[1]);
                const bc = getMid(vertices, midCache, f[1], f[2]);
                const ca = getMid(vertices, midCache, f[2], f[0]);
                newFaces.push([f[0],ab,ca], [f[1],bc,ab], [f[2],ca,bc], [ab,bc,ca]);
            });
            faces = newFaces;
        }
        
        return { vertices, faces };
    }
    
    function norm(v) {
        const len = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
        return [v[0]/len, v[1]/len, v[2]/len];
    }
    
    function getMid(verts, cache, a, b) {
        const key = a<b ? `${a}_${b}` : `${b}_${a}`;
        if (cache[key] !== undefined) return cache[key];
        const va=verts[a], vb=verts[b];
        const mid = norm([(va[0]+vb[0])/2, (va[1]+vb[1])/2, (va[2]+vb[2])/2]);
        verts.push(mid);
        cache[key] = verts.length - 1;
        return cache[key];
    }
    
    // === ANIMÁCIÓ ===
    function playRebuildAnimation(targetUrl) {
        const backBtn = document.getElementById('stargate-back-btn');
        if (backBtn) backBtn.style.display = 'none';
        
        // Font
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;';
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = window.innerWidth;
        const H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);
        
        const cx = W / 2;
        const cy = H / 2;
        
        // === GÖMB MÉRETEK ===
        const threeRadius = isMobile ? 1.8 : 2.5;
        const cameraZ = isMobile ? 12 : 10;
        const fov = 75;
        const fovRad = fov * Math.PI / 180;
        const finalSphereRadius = (threeRadius / (Math.tan(fovRad/2) * cameraZ)) * (H / 2);
        const bigSphereRadius = Math.min(W, H) * 0.42;
        
        const ico = generateIcosahedron(2);
        
        // === OLDAL FRAGMENTEK (GRID) ===
        const pageFragments = [];
        const gridSize = isMobile ? 60 : 45;
        const maxDist = Math.sqrt(W*W + H*H) * 0.6;
        
        for (let y = 0; y < H + gridSize; y += gridSize) {
            for (let x = 0; x < W + gridSize; x += gridSize) {
                const px = x + Math.random() * 10;
                const py = y + Math.random() * 10;
                
                const dx = px - cx;
                const dy = py - cy;
                const angle = Math.atan2(dy, dx);
                
                pageFragments.push({
                    startX: px,
                    startY: py,
                    angle: angle,
                    size: gridSize * (0.7 + Math.random() * 0.3),
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.03,
                    delay: Math.random() * 0.2
                });
            }
        }
        
        // === GÖMB FRAGMENTEK ===
        // Minden háromszögnek van egy OFFSET-je ahonnan indul (kintről)
        const sphereFragments = [];
        
        ico.faces.forEach((face, i) => {
            const v0 = ico.vertices[face[0]];
            const v1 = ico.vertices[face[1]];
            const v2 = ico.vertices[face[2]];
            
            // Háromszög középpontja (3D, egységgömbön)
            const center3D = norm([
                (v0[0]+v1[0]+v2[0])/3,
                (v0[1]+v1[1]+v2[1])/3,
                (v0[2]+v1[2]+v2[2])/3
            ]);
            
            // Kezdő OFFSET - minden háromszög a gömb középpontjától KIFELÉ indul
            // Az offset iránya a háromszög normálvektora (center3D)
            const offsetMultiplier = maxDist * (1.5 + Math.random() * 0.5);
            
            sphereFragments.push({
                face,
                v0, v1, v2,
                center3D,
                // Az offset amit hozzáadunk a pozícióhoz (ez csökken 0-ra)
                offsetX: center3D[0] * offsetMultiplier,
                offsetY: -center3D[1] * offsetMultiplier, // Y fordított
                delay: Math.random() * 0.4
            });
        });
        
        // === CSILLAGOK ===
        const stars = [];
        for (let i = 0; i < (isMobile ? 60 : 120); i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 1.2 + 0.3,
                opacity: Math.random() * 0.3 + 0.1
            });
        }
        
        // === FÁZISOK ===
        // 1: Oldal szétrobban (0 - 3s)
        // 2: Gömb összeáll NAGYBAN (3 - 8s)
        // 3: Gömb zsugorodik (8 - 10s)
        // 4: UI megjelenik (10 - 12s)
        
        const totalDuration = 12.0;
        const startTime = performance.now();
        let sphereRotation = 0;
        
        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            
            sphereRotation += 0.002;
            
            // === FÁZIS 1: OLDAL SZÉTROBBAN (0 - 3s) ===
            if (elapsed < 3.0) {
                const t = elapsed / 3.0;
                
                pageFragments.forEach(frag => {
                    const localT = Math.max(0, (t - frag.delay) / (1 - frag.delay));
                    const eased = easeOutCubic(localT);
                    
                    const moveDist = maxDist * eased;
                    const x = frag.startX + Math.cos(frag.angle) * moveDist;
                    const y = frag.startY + Math.sin(frag.angle) * moveDist;
                    
                    frag.rotation += frag.rotSpeed;
                    
                    const opacity = 1 - eased * 0.8;
                    const size = frag.size * (1 - eased * 0.3);
                    
                    if (opacity > 0.02) {
                        drawPageTriangle(ctx, x, y, size, frag.rotation, opacity);
                    }
                });
            }
            
            // === FÁZIS 2: GÖMB ÖSSZEÁLL NAGYBAN (3 - 8s) ===
            else if (elapsed < 8.0) {
                const t = (elapsed - 3.0) / 5.0;
                const globalEased = easeInOutCubic(t);
                
                // Csillagok
                stars.forEach(star => {
                    ctx.fillStyle = `rgba(255,255,255,${star.opacity * globalEased * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Minden gömb háromszöget rajzolunk
                // Az offset fokozatosan csökken 0-ra
                ctx.strokeStyle = `rgba(255,255,255,${0.15 + globalEased * 0.1})`;
                ctx.lineWidth = 0.8;
                
                sphereFragments.forEach(frag => {
                    const localT = Math.max(0, Math.min(1, (t - frag.delay) / (1 - frag.delay)));
                    const localEased = easeInOutCubic(localT);
                    
                    // Az offset csökken: kezdetben nagy, végén 0
                    const currentOffsetX = frag.offsetX * (1 - localEased);
                    const currentOffsetY = frag.offsetY * (1 - localEased);
                    
                    // A gömb háromszög 3 csúcsát projektáljuk
                    // A pozíciójuk: gömb pozíció + offset
                    const p0 = project3D(frag.v0, cx, cy, bigSphereRadius, sphereRotation);
                    const p1 = project3D(frag.v1, cx, cy, bigSphereRadius, sphereRotation);
                    const p2 = project3D(frag.v2, cx, cy, bigSphereRadius, sphereRotation);
                    
                    // Rajzoljuk az offsettel
                    ctx.beginPath();
                    ctx.moveTo(p0.x + currentOffsetX, p0.y + currentOffsetY);
                    ctx.lineTo(p1.x + currentOffsetX, p1.y + currentOffsetY);
                    ctx.lineTo(p2.x + currentOffsetX, p2.y + currentOffsetY);
                    ctx.closePath();
                    ctx.stroke();
                });
            }
            
            // === FÁZIS 3: GÖMB ZSUGORODIK (8 - 10s) ===
            else if (elapsed < 10.0) {
                const t = (elapsed - 8.0) / 2.0;
                const eased = easeInOutCubic(t);
                
                // Csillagok
                stars.forEach(star => {
                    ctx.fillStyle = `rgba(255,255,255,${star.opacity * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Gömb: NAGY -> végső
                const currentRadius = bigSphereRadius + (finalSphereRadius - bigSphereRadius) * eased;
                drawSphereWireframe(ctx, ico, cx, cy, currentRadius, sphereRotation, 0.25);
                
                // BOMBASZ felirat
                if (t > 0.3) {
                    drawTitle(ctx, cx, cy, (t - 0.3) / 0.7, W, isMobile);
                }
            }
            
            // === FÁZIS 4: UI (10 - 12s) ===
            else {
                const t = Math.min(1, (elapsed - 10.0) / 2.0);
                const eased = easeOutCubic(t);
                
                // Csillagok
                stars.forEach(star => {
                    ctx.fillStyle = `rgba(255,255,255,${star.opacity * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Gömb
                drawSphereWireframe(ctx, ico, cx, cy, finalSphereRadius, sphereRotation, 0.25);
                
                // Címsor
                drawTitle(ctx, cx, cy, 1, W, isMobile);
                
                // Header
                drawHeader(ctx, W, eased, isMobile);
                
                // Scroll hint
                if (t > 0.3) {
                    drawScrollHint(ctx, cx, H, (t-0.3)/0.7, isMobile);
                }
                
                // Óra
                if (t > 0.4) {
                    drawClock(ctx, cx, H, (t-0.4)/0.6, isMobile);
                }
            }
            
            if (elapsed >= totalDuration) {
                window.location.href = targetUrl;
                return;
            }
            
            requestAnimationFrame(animate);
        }
        
        setTimeout(animate, 100);
    }
    
    // === 3D PROJEKCIÓ ===
    function project3D(point, cx, cy, radius, rot) {
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const x = point[0] * cosR - point[2] * sinR;
        const z = point[0] * sinR + point[2] * cosR;
        const y = point[1];
        return { x: cx + x * radius, y: cy - y * radius, z: z };
    }
    
    // === OLDAL HÁROMSZÖG ===
    function drawPageTriangle(ctx, x, y, size, rot, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.fillStyle = `rgba(255,255,255,${opacity * 0.03})`;
        ctx.lineWidth = 0.8;
        
        const h = size * 0.866;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.6);
        ctx.lineTo(size * 0.5, h * 0.4);
        ctx.lineTo(-size * 0.5, h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    // === GÖMB WIREFRAME ===
    function drawSphereWireframe(ctx, ico, cx, cy, radius, rot, opacity) {
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = 0.8;
        
        ico.faces.forEach(face => {
            const p0 = project3D(ico.vertices[face[0]], cx, cy, radius, rot);
            const p1 = project3D(ico.vertices[face[1]], cx, cy, radius, rot);
            const p2 = project3D(ico.vertices[face[2]], cx, cy, radius, rot);
            
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.closePath();
            ctx.stroke();
        });
    }
    
    // === BOMBASZ CÍMSOR ===
    function drawTitle(ctx, cx, cy, opacity, W, mobile) {
        const fontSize = mobile ? Math.min(W * 0.1, 50) : Math.min(120, Math.max(40, W * 0.12));
        const spacing = fontSize * (mobile ? 0.1 : 0.2);
        
        ctx.font = `900 ${fontSize}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = 'BOMBASZ';
        let totalW = 0;
        for (let i = 0; i < text.length; i++) {
            totalW += ctx.measureText(text[i]).width + (i < text.length-1 ? spacing : 0);
        }
        
        let xPos = cx - totalW/2;
        for (let i = 0; i < text.length; i++) {
            const charW = ctx.measureText(text[i]).width;
            ctx.fillText(text[i], xPos + charW/2, cy);
            xPos += charW + spacing;
        }
    }
    
    // === HEADER ===
    function drawHeader(ctx, W, opacity, mobile) {
        const padX = mobile ? 20 : 40;
        const padY = mobile ? 15 : 20;
        const logoSize = mobile ? 11 : 14;
        const btnSize = mobile ? 9 : 10;
        const btnPadX = mobile ? 14 : 20;
        const btnPadY = mobile ? 8 : 10;
        
        ctx.font = `900 ${logoSize}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('BOMBASZ', padX, padY);
        
        ctx.font = `700 ${btnSize}px Orbitron, sans-serif`;
        const btnText = 'BELÉPÉS';
        const btnTextW = ctx.measureText(btnText).width;
        const btnW = btnTextW + btnPadX * 2;
        const btnH = btnSize + btnPadY * 2;
        const btnX = W - padX - btnW;
        const btnY = padY;
        
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btnText, btnX + btnW/2, btnY + btnH/2);
    }
    
    // === SCROLL HINT ===
    function drawScrollHint(ctx, cx, H, t, mobile) {
        const bottom = mobile ? 30 : 50;
        const fontSize = mobile ? 9 : 10;
        const opacity = Math.min(0.3, t * 0.3);
        const y = H - bottom;
        
        ctx.font = `400 ${fontSize}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SCROLL', cx, y - 20);
        
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 6, y - 5);
        ctx.lineTo(cx, y + 2);
        ctx.lineTo(cx + 6, y - 5);
        ctx.stroke();
    }
    
    // === ÓRA ===
    function drawClock(ctx, cx, H, t, mobile) {
        const bottom = mobile ? 15 : 25;
        const fontSize = mobile ? 9 : 11;
        const opacity = t * 0.25;
        
        const time = new Date().toLocaleTimeString('hu-HU', {
            hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
        });
        
        ctx.font = `400 ${fontSize}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(136,136,136,${opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(time, cx, H - bottom);
    }
    
    // === EASING ===
    function easeOutCubic(t) { return 1-Math.pow(1-t,3); }
    function easeInOutCubic(t) { return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
    
    // === BELÉPÉSI ANIMÁCIÓ ===
    function playEntryAnimation() {
        sessionStorage.setItem('came-from-home', 'true');
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:#000;z-index:999999;pointer-events:none;
            transition:opacity 0.8s ease;
        `;
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 800);
            });
        });
    }
    
    // === INIT ===
    const shouldAnimate = sessionStorage.getItem('stargate-entry');
    if (shouldAnimate) {
        sessionStorage.removeItem('stargate-entry');
        playEntryAnimation();
    }
    
    // Delay back button to let user-ui.js bar appear first
    function initBackButton() {
        // Try immediately, and also after a delay in case bar loads later
        addBackButton();
        setTimeout(() => {
            // Reposition if bar appeared after initial render
            const existing = document.getElementById('stargate-back-btn');
            const hasBar = document.body.classList.contains('has-user-bar') || document.getElementById('bombasz-user-bar');
            if (existing && hasBar) {
                existing.style.top = '54px';
            }
        }, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButton);
    } else {
        initBackButton();
    }
})();
