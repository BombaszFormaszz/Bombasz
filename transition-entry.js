// ==========================================
// BOMBASZ - Particle Accelerator Transition v5
// Szétrobbanás → Összeállás → Pörgés → FLASH
// ==========================================

(function() {
    
    // === VISSZA GOMB ===
    function addBackButton() {
        if (document.getElementById('stargate-back-btn')) return;
        
        const btn = document.createElement('a');
        btn.id = 'stargate-back-btn';
        btn.href = 'index.html';
        btn.innerHTML = '← Vissza';
        btn.title = 'Vissza a főoldalra';
        
        btn.style.cssText = `
            position: fixed;
            top: 15px;
            left: 15px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            color: rgba(255, 255, 255, 0.7);
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            text-decoration: none;
            cursor: pointer;
            z-index: 9999;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(255, 255, 255, 0.2)';
            btn.style.color = 'rgba(255, 255, 255, 1)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
            btn.style.color = 'rgba(255, 255, 255, 0.7)';
        });
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            playAcceleratorAnimation('index.html');
        });
        
        document.body.appendChild(btn);
    }
    
    // === PARTICLE ACCELERATOR ANIMÁCIÓ ===
    function playAcceleratorAnimation(targetUrl) {
        const backBtn = document.getElementById('stargate-back-btn');
        if (backBtn) backBtn.style.display = 'none';
        
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999999;
        `;
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
        
        // === FRAGMENTEK LÉTREHOZÁSA ===
        const fragments = [];
        const gridSize = 50;
        
        for (let y = -gridSize; y < H + gridSize; y += gridSize * 0.75) {
            let offset = (Math.floor(y / (gridSize * 0.75)) % 2) * (gridSize / 2);
            for (let x = -gridSize; x < W + gridSize; x += gridSize) {
                const px = x + offset + Math.random() * 10;
                const py = y + Math.random() * 10;
                
                const dx = px - cx;
                const dy = py - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                fragments.push({
                    // Pozíciók
                    originalX: px,
                    originalY: py,
                    x: px,
                    y: py,
                    // Robbanás
                    explodeAngle: angle,
                    explodeSpeed: 15 + Math.random() * 20,
                    // Forgás
                    rotation: 0,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    orbitAngle: angle,
                    orbitRadius: 0,
                    // Tulajdonságok
                    size: 20 + Math.random() * 30,
                    dist: dist,
                    opacity: 1,
                    // Trail
                    trail: []
                });
            }
        }
        
        // === FÁZISOK ===
        // 1: Szétrobbanás (0 - 0.8s)
        // 2: Összeállás középre (0.8 - 1.6s)
        // 3: Gyorsuló pörgés (1.6 - 2.8s)
        // 4: Flash és navigáció (2.8 - 3.2s)
        
        const phases = {
            explode: { start: 0, end: 0.8 },
            collapse: { start: 0.8, end: 1.6 },
            spin: { start: 1.6, end: 2.8 },
            flash: { start: 2.8, end: 3.2 }
        };
        
        const totalDuration = 3.2;
        const startTime = performance.now();
        
        let flashIntensity = 0;
        let screenShake = 0;
        
        function animate() {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(1, elapsed / totalDuration);
            
            // Screen shake offset
            const shakeX = (Math.random() - 0.5) * screenShake;
            const shakeY = (Math.random() - 0.5) * screenShake;
            
            // Háttér
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            
            ctx.save();
            ctx.translate(shakeX, shakeY);
            
            // === FÁZIS 1: SZÉTROBBANÁS ===
            if (elapsed < phases.explode.end) {
                const t = elapsed / phases.explode.end;
                const eased = easeOutCubic(t);
                
                fragments.forEach(frag => {
                    const explodeDist = frag.explodeSpeed * eased * 30;
                    frag.x = frag.originalX + Math.cos(frag.explodeAngle) * explodeDist;
                    frag.y = frag.originalY + Math.sin(frag.explodeAngle) * explodeDist;
                    frag.rotation += frag.rotationSpeed;
                    frag.opacity = 1;
                    
                    drawTriangle(ctx, frag.x, frag.y, frag.size, frag.rotation, frag.opacity);
                });
            }
            
            // === FÁZIS 2: ÖSSZEÁLLÁS ===
            else if (elapsed < phases.collapse.end) {
                const t = (elapsed - phases.collapse.start) / (phases.collapse.end - phases.collapse.start);
                const eased = easeInOutCubic(t);
                
                fragments.forEach(frag => {
                    // Kezdő pozíció (szétrobbant állapot)
                    const explodedX = frag.originalX + Math.cos(frag.explodeAngle) * frag.explodeSpeed * 30;
                    const explodedY = frag.originalY + Math.sin(frag.explodeAngle) * frag.explodeSpeed * 30;
                    
                    // Cél: középpont körüli kis sugarú kör
                    const targetRadius = 80 + Math.random() * 40;
                    const targetX = cx + Math.cos(frag.orbitAngle) * targetRadius;
                    const targetY = cy + Math.sin(frag.orbitAngle) * targetRadius;
                    
                    frag.x = explodedX + (targetX - explodedX) * eased;
                    frag.y = explodedY + (targetY - explodedY) * eased;
                    frag.orbitRadius = targetRadius;
                    frag.rotation += frag.rotationSpeed * (1 + eased * 2);
                    frag.size = frag.size * (1 - eased * 0.3) + 15 * eased;
                    
                    drawTriangle(ctx, frag.x, frag.y, Math.max(10, frag.size), frag.rotation, 1);
                });
                
                // Kezdődő energia gyűrű
                const ringOpacity = eased * 0.3;
                drawEnergyRing(ctx, cx, cy, 100, ringOpacity, elapsed * 2);
            }
            
            // === FÁZIS 3: GYORSULÓ PÖRGÉS ===
            else if (elapsed < phases.spin.end) {
                const t = (elapsed - phases.spin.start) / (phases.spin.end - phases.spin.start);
                const eased = easeInCubic(t); // Gyorsulás!
                
                // Gyorsuló pörgési sebesség
                const spinSpeed = 0.02 + eased * 0.5;
                // Zsugorodó sugár
                const radiusMultiplier = 1 - eased * 0.85;
                // Screen shake növekszik
                screenShake = eased * 15;
                
                fragments.forEach(frag => {
                    frag.orbitAngle += spinSpeed;
                    const currentRadius = frag.orbitRadius * radiusMultiplier;
                    
                    // Trail hozzáadása
                    if (frag.trail.length > 15) frag.trail.shift();
                    frag.trail.push({ x: frag.x, y: frag.y, opacity: 0.5 });
                    
                    frag.x = cx + Math.cos(frag.orbitAngle) * currentRadius;
                    frag.y = cy + Math.sin(frag.orbitAngle) * currentRadius;
                    frag.rotation += 0.1 + eased * 0.5;
                    
                    // Trail rajzolása
                    frag.trail.forEach((tp, i) => {
                        const trailOpacity = (i / frag.trail.length) * 0.4 * (1 - eased * 0.5);
                        ctx.fillStyle = `rgba(100, 200, 255, ${trailOpacity})`;
                        ctx.beginPath();
                        ctx.arc(tp.x, tp.y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    });
                    
                    // Fragment méret csökken
                    const size = Math.max(5, 15 * (1 - eased * 0.7));
                    drawTriangle(ctx, frag.x, frag.y, size, frag.rotation, 1);
                });
                
                // Intenzív energia gyűrűk
                const ringCount = 3 + Math.floor(eased * 5);
                for (let i = 0; i < ringCount; i++) {
                    const ringRadius = 80 * radiusMultiplier + i * 20;
                    const ringOpacity = 0.3 + eased * 0.5;
                    drawEnergyRing(ctx, cx, cy, ringRadius, ringOpacity, elapsed * (5 + i * 2));
                }
                
                // Központi energia gömb
                const coreSize = 20 + eased * 60;
                const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
                coreGradient.addColorStop(0, `rgba(255, 255, 255, ${0.5 + eased * 0.5})`);
                coreGradient.addColorStop(0.3, `rgba(150, 220, 255, ${0.4 + eased * 0.4})`);
                coreGradient.addColorStop(0.7, `rgba(100, 150, 255, ${0.2 + eased * 0.3})`);
                coreGradient.addColorStop(1, 'rgba(50, 100, 255, 0)');
                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Villámok
                if (eased > 0.5) {
                    const boltCount = Math.floor((eased - 0.5) * 20);
                    for (let i = 0; i < boltCount; i++) {
                        drawLightningBolt(ctx, cx, cy, 50 + Math.random() * 100, Math.random() * Math.PI * 2);
                    }
                }
                
                flashIntensity = eased * 0.3;
            }
            
            // === FÁZIS 4: FLASH ===
            else {
                const t = (elapsed - phases.flash.start) / (phases.flash.end - phases.flash.start);
                flashIntensity = easeOutCubic(t);
                screenShake = 15 * (1 - t);
                
                // Utolsó pörgő mag
                const finalRadius = 10 * (1 - t);
                fragments.forEach(frag => {
                    frag.orbitAngle += 0.5;
                    frag.x = cx + Math.cos(frag.orbitAngle) * finalRadius;
                    frag.y = cy + Math.sin(frag.orbitAngle) * finalRadius;
                    
                    if (t < 0.5) {
                        drawTriangle(ctx, frag.x, frag.y, 3, frag.rotation, 1 - t * 2);
                    }
                });
                
                // Központi vakító fény
                const flashGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, W);
                flashGradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
                flashGradient.addColorStop(0.1, `rgba(200, 230, 255, ${0.9})`);
                flashGradient.addColorStop(0.3, `rgba(150, 200, 255, ${0.6 * flashIntensity})`);
                flashGradient.addColorStop(1, `rgba(100, 150, 255, 0)`);
                ctx.fillStyle = flashGradient;
                ctx.fillRect(0, 0, W, H);
            }
            
            ctx.restore();
            
            // Globális flash overlay
            if (flashIntensity > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
                ctx.fillRect(0, 0, W, H);
            }
            
            // Navigáció
            if (elapsed >= totalDuration) {
                sessionStorage.setItem('stargate-entry', 'true');
                window.location.href = targetUrl;
                return;
            }
            
            requestAnimationFrame(animate);
        }
        
        animate();
    }
    
    // === RAJZOLÓ FÜGGVÉNYEK ===
    
    function drawTriangle(ctx, x, y, size, rotation, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.1})`;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(size * 0.5, size * 0.4);
        ctx.lineTo(-size * 0.5, size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    function drawEnergyRing(ctx, x, y, radius, opacity, time) {
        ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -time * 50;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
    }
    
    function drawLightningBolt(ctx, cx, cy, length, angle) {
        ctx.strokeStyle = `rgba(150, 200, 255, ${0.3 + Math.random() * 0.5})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        
        ctx.beginPath();
        let x = cx;
        let y = cy;
        ctx.moveTo(x, y);
        
        const segments = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < segments; i++) {
            const segLength = length / segments;
            angle += (Math.random() - 0.5) * 1;
            x += Math.cos(angle) * segLength;
            y += Math.sin(angle) * segLength;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // === EASING ===
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInCubic(t) { return t * t * t; }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    
    // === BELÉPÉSI ANIMÁCIÓ (egyszerű fade) ===
    function playEntryAnimation() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 999999;
            pointer-events: none;
            transition: opacity 0.4s ease;
        `;
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 400);
        });
    }
    
    // === INIT ===
    const shouldAnimate = sessionStorage.getItem('stargate-entry');
    if (shouldAnimate) {
        sessionStorage.removeItem('stargate-entry');
        playEntryAnimation();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addBackButton);
    } else {
        addBackButton();
    }
})();
