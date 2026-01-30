// ==========================================
// BOMBASZ - Stargate Seamless Page Transition v3
// A VALÓDI Three.js gúlákat animálja!
// ==========================================

class StargateTransition {
    constructor() {
        this.isTransitioning = false;
        this.targetUrl = null;
        this.animationId = null;
        this.phase = 'idle';
        this.progress = 0;
        this.overlay = null;
        this.startTime = 0;
        
        // Mentett eredeti pozíciók
        this.originalPositions = [];
        this.originalRotations = [];
        
        this.init();
    }
    
    init() {
        // Csak egy egyszerű overlay a flash-hez
        this.overlay = document.createElement('div');
        this.overlay.id = 'stargate-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 99999;
            pointer-events: none;
            background: white;
            opacity: 0;
            transition: opacity 0.1s ease;
        `;
        document.body.appendChild(this.overlay);
        
        // Linkek elfogása
        this.interceptLinks();
        
        // Belépési animáció
        this.checkEntryAnimation();
    }
    
    interceptLinks() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a.item-label');
            if (!link) return;
            
            const url = link.getAttribute('href');
            const isDownload = link.hasAttribute('download');
            const isExternal = link.getAttribute('target') === '_blank' || 
                              (url && url.startsWith('http'));
            
            if (isDownload || isExternal) return;
            
            e.preventDefault();
            e.stopPropagation();
            this.startTransition(url);
        }, true);
    }
    
    checkEntryAnimation() {
        const shouldAnimate = sessionStorage.getItem('stargate-entry');
        if (shouldAnimate) {
            sessionStorage.removeItem('stargate-entry');
            setTimeout(() => this.playEntryAnimation(), 100);
        }
    }
    
    startTransition(url) {
        if (this.isTransitioning) return;
        if (typeof categorySubFragments === 'undefined' || typeof currentCategory === 'undefined') {
            window.location.href = url;
            return;
        }
        
        this.isTransitioning = true;
        this.targetUrl = url;
        this.phase = 'collapse';
        this.progress = 0;
        this.startTime = performance.now();
        
        // Mentjük az eredeti pozíciókat
        this.saveOriginalPositions();
        
        // Indítjuk az animációt
        this.animateThreeJS();
    }
    
    saveOriginalPositions() {
        this.originalPositions = [];
        this.originalRotations = [];
        
        const subFrags = categorySubFragments[currentCategory];
        if (subFrags) {
            subFrags.forEach(frag => {
                this.originalPositions.push(frag.mesh.position.clone());
                this.originalRotations.push(frag.mesh.rotation.clone());
            });
        }
    }
    
    animateThreeJS() {
        const elapsed = (performance.now() - this.startTime) / 1000;
        const subFrags = categorySubFragments[currentCategory];
        
        if (!subFrags || subFrags.length === 0) {
            window.location.href = this.targetUrl;
            return;
        }
        
        if (this.phase === 'collapse') {
            // Fázis 1: Gúlák a középpontba (0-1.2s)
            this.progress = Math.min(1, elapsed / 1.2);
            const eased = this.easeInOutCubic(this.progress);
            
            subFrags.forEach((frag, i) => {
                const delay = i * 0.05;
                const t = Math.max(0, Math.min(1, (this.progress - delay / 1.2) * 1.5));
                const localEased = this.easeInOutCubic(t);
                
                // Pozíció a középpont felé
                const targetPos = new THREE.Vector3(0, 0, 0);
                frag.mesh.position.lerpVectors(this.originalPositions[i], targetPos, localEased);
                
                // Gyorsuló forgás
                frag.mesh.rotation.x += 0.05 * (1 + t * 3);
                frag.mesh.rotation.y += 0.07 * (1 + t * 3);
                frag.mesh.rotation.z += 0.03 * (1 + t * 3);
                
                // Opacity marad
                frag.mesh.material.opacity = 0.8;
            });
            
            if (this.progress >= 1) {
                this.phase = 'vortex';
                this.progress = 0;
                this.startTime = performance.now();
            }
        }
        else if (this.phase === 'vortex') {
            // Fázis 2: Örvénylés (0-0.8s)
            this.progress = Math.min(1, elapsed / 0.8);
            
            subFrags.forEach((frag, i) => {
                const angle = (i / subFrags.length) * Math.PI * 2;
                const baseAngle = angle + this.progress * Math.PI * 6; // Több körözés
                const radius = 0.5 * (1 - this.progress * 0.9); // Zsugorodik
                
                frag.mesh.position.x = Math.cos(baseAngle) * radius;
                frag.mesh.position.y = Math.sin(baseAngle) * radius;
                frag.mesh.position.z = this.progress * -2; // Előre "szippantás"
                
                // Még gyorsabb forgás
                frag.mesh.rotation.x += 0.15;
                frag.mesh.rotation.y += 0.2;
                frag.mesh.rotation.z += 0.1;
                
                // Méret csökkenés
                const scale = Math.max(0.1, 1 - this.progress * 0.8);
                frag.mesh.scale.setScalar(scale);
                
                // Fade out
                frag.mesh.material.opacity = Math.max(0, 0.8 - this.progress * 0.8);
            });
            
            if (this.progress >= 1) {
                this.phase = 'flash';
                this.progress = 0;
                this.startTime = performance.now();
                sessionStorage.setItem('stargate-entry', 'true');
            }
        }
        else if (this.phase === 'flash') {
            // Fázis 3: Fehér flash (0-0.4s)
            this.progress = Math.min(1, elapsed / 0.4);
            
            this.overlay.style.opacity = this.progress;
            
            if (this.progress >= 0.6) {
                window.location.href = this.targetUrl;
                return;
            }
        }
        
        this.animationId = requestAnimationFrame(() => this.animateThreeJS());
    }
    
    playEntryAnimation() {
        // Az aloldalakon nincs Three.js, szóval ott marad a 2D canvas verzió
        // Ezt a transition-entry.js kezeli
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}

// Inicializálás
document.addEventListener('DOMContentLoaded', () => {
    window.stargateTransition = new StargateTransition();
});
