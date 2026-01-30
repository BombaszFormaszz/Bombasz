// ==========================================
// BOMBASZ - Stargate Entry Animation v2
// Belépési animáció az aloldalakhoz
// ==========================================

(function() {
    // Ellenőrizzük, hogy kell-e belépési animáció
    const shouldAnimate = sessionStorage.getItem('stargate-entry');
    if (!shouldAnimate) return;
    
    sessionStorage.removeItem('stargate-entry');
    
    // Overlay létrehozása
    const overlay = document.createElement('div');
    overlay.id = 'stargate-entry-overlay';
    overlay.innerHTML = '<canvas id="stargate-entry-canvas"></canvas>';
    
    const style = document.createElement('style');
    style.textContent = `
        #stargate-entry-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999999;
            background: white;
        }
        #stargate-entry-canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    const canvas = document.getElementById('stargate-entry-canvas');
    const ctx = canvas.getContext('2d');
    
    // Canvas méretezés
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Gúlák inicializálása
    const pyramids = [];
    const pyramidCount = 15;
    for (let i = 0; i < pyramidCount; i++) {
        const angle = (i / pyramidCount) * Math.PI * 2;
        const targetRadius = 180 + Math.random() * 150;
        pyramids.push({
            x: centerX,
            y: centerY,
            targetX: centerX + Math.cos(angle) * targetRadius,
            targetY: centerY + Math.sin(angle) * targetRadius,
            size: 5,
            targetSize: 18 + Math.random() * 12,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: 0.03 + Math.random() * 0.03,
            delay: i * 0.025,
            opacity: 1
        });
    }
    
    // Részecskék
    const particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: centerX,
            y: centerY,
            size: 1 + Math.random() * 3,
            speed: 3 + Math.random() * 6,
            angle: Math.random() * Math.PI * 2,
            opacity: 0.4 + Math.random() * 0.6
        });
    }
    
    let progress = 0;
    
    // Utility függvények
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    function drawPyramid(x, y, size, rotation, opacity) {
        if (opacity < 0.01) return;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 1.5;
        
        const s = size;
        
        // Tetraéder alap
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.closePath();
        ctx.stroke();
        
        // Belső élek
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(0, s * 0.25);
        ctx.moveTo(-s * 0.866, s * 0.5);
        ctx.lineTo(0, s * 0.25);
        ctx.moveTo(s * 0.866, s * 0.5);
        ctx.lineTo(0, s * 0.25);
        ctx.stroke();
        
        ctx.restore();
    }
    
    function drawCenterGlow(intensity, radius) {
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        gradient.addColorStop(0.3, `rgba(200, 220, 255, ${intensity * 0.6})`);
        gradient.addColorStop(0.6, `rgba(100, 150, 255, ${intensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(50, 100, 200, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function animate() {
        progress += 0.02;
        
        // Fehérből feketébe/átlátszóba fade
        const bgOpacity = Math.min(1, progress * 1.8);
        ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        
        // Csillagkapu összehúzódás
        if (progress < 0.5) {
            const portalProgress = 1 - (progress * 2);
            const portalRadius = Math.max(0, portalProgress * Math.max(window.innerWidth, window.innerHeight) * 0.8);
            drawCenterGlow(portalProgress, portalRadius);
        }
        
        // Gúlák szétrobbanása
        if (progress > 0.25) {
            const expandProgress = (progress - 0.25) / 0.75;
            
            pyramids.forEach((p, i) => {
                const t = Math.max(0, Math.min(1, (expandProgress - p.delay) * 1.3));
                const eased = easeOutBack(t);
                
                p.x = lerp(centerX, p.targetX, eased);
                p.y = lerp(centerY, p.targetY, eased);
                p.size = lerp(5, p.targetSize, eased);
                p.rotation += p.rotationSpeed * (1 + (1 - t) * 3);
                p.opacity = Math.min(1, t * 2) * (1 - Math.max(0, (expandProgress - 0.65) / 0.35));
                
                if (p.opacity > 0.01) {
                    drawPyramid(p.x, p.y, p.size, p.rotation, p.opacity);
                }
            });
        }
        
        // Részecskék szétszóródása
        particles.forEach(p => {
            p.x += Math.cos(p.angle) * p.speed * 1.5;
            p.y += Math.sin(p.angle) * p.speed * 1.5;
            p.opacity = Math.max(0, p.opacity - 0.012);
            
            if (p.opacity > 0.01) {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Animáció vége
        if (progress >= 1.15) {
            overlay.style.transition = 'opacity 0.4s ease';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 400);
            return;
        }
        
        requestAnimationFrame(animate);
    }
    
    // Indítás
    requestAnimationFrame(animate);
})();
