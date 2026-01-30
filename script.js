// --- GLOBÁLIS VÁLTOZÓK ---
let sphereAnimationParams = { explosion: 0 }; 

// --- THREE.JS ANIMÁCIÓ & LOGIKA (HÁTTÉR) ---
(function () {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.02); 

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Mobil vs Monitor kamera távolság
    if (window.innerWidth < 768) {
        camera.position.z = 16; 
    } else {
        camera.position.z = 10; 
    }

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // --- 1. RÉSZECSKÉK ---
    const particleCount = 700;
    const pPositions = new Float32Array(particleCount * 3);
    const velocities = [];
    for (let i = 0; i < particleCount; i++) {
        pPositions[i * 3] = (Math.random() - 0.5) * 30;
        pPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        pPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        velocities.push({
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.01
        });
    }
    const pGeometry = new THREE.BufferGeometry();
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMaterial = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.03, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(pGeometry, pMaterial);
    scene.add(particles);

    // --- 2. GÖMB (ICO) ---
    const baseGeo = new THREE.IcosahedronGeometry(2, 2); 
    const nonIndexedGeo = baseGeo.toNonIndexed();
    const posAttribute = nonIndexedGeo.attributes.position;
    const vertexCount = posAttribute.count;
    
    const originalPositions = new Float32Array(vertexCount * 3);
    const directions = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i += 3) {
        const x1 = posAttribute.getX(i), y1 = posAttribute.getY(i), z1 = posAttribute.getZ(i);
        const x2 = posAttribute.getX(i+1), y2 = posAttribute.getY(i+1), z2 = posAttribute.getZ(i+1);
        const x3 = posAttribute.getX(i+2), y3 = posAttribute.getY(i+2), z3 = posAttribute.getZ(i+2);

        originalPositions[i*3] = x1; originalPositions[i*3+1] = y1; originalPositions[i*3+2] = z1;
        originalPositions[(i+1)*3] = x2; originalPositions[(i+1)*3+1] = y2; originalPositions[(i+1)*3+2] = z2;
        originalPositions[(i+2)*3] = x3; originalPositions[(i+2)*3+1] = y3; originalPositions[(i+2)*3+2] = z3;

        const cx = (x1 + x2 + x3) / 3, cy = (y1 + y2 + y3) / 3, cz = (z1 + z2 + z3) / 3;
        const len = Math.sqrt(cx*cx + cy*cy + cz*cz);
        const dx = cx / len, dy = cy / len, dz = cz / len;
        const driftX = (Math.random() - 0.5) * 0.5, driftY = (Math.random() - 0.5) * 0.5, driftZ = (Math.random() - 0.5) * 0.5;

        for(let k=0; k<3; k++) {
            directions[(i+k)*3] = dx + driftX;
            directions[(i+k)*3+1] = dy + driftY;
            directions[(i+k)*3+2] = dz + driftZ;
        }
    }
    nonIndexedGeo.setAttribute('position', new THREE.BufferAttribute(originalPositions.slice(), 3));

    const icoMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, wireframe: true, transparent: true, opacity: 0.2, side: THREE.DoubleSide
    });
    const ico = new THREE.Mesh(nonIndexedGeo, icoMat);
    mainGroup.add(ico);

    // --- ANIMÁCIÓS LOOP ---
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);
        const mouseInfluence = Math.max(0, 1 - sphereAnimationParams.explosion * 2);

        mainGroup.rotation.x += (mouseY * 0.5 - mainGroup.rotation.x) * 0.02 * mouseInfluence;
        mainGroup.rotation.y += (mouseX * 0.5 - mainGroup.rotation.y) * 0.02 * mouseInfluence;
        mainGroup.rotation.z += 0.0005; 

        const pos = nonIndexedGeo.attributes.position.array;
        const exp = sphereAnimationParams.explosion; 

        if (exp > 0.001) {
            for (let i = 0; i < vertexCount; i++) {
                pos[i*3]   = originalPositions[i*3]   + directions[i*3]   * exp * 15;
                pos[i*3+1] = originalPositions[i*3+1] + directions[i*3+1] * exp * 15;
                pos[i*3+2] = originalPositions[i*3+2] + directions[i*3+2] * exp * 15;
            }
        } else {
            for (let i = 0; i < vertexCount * 3; i++) {
                pos[i] = originalPositions[i];
            }
        }
        nonIndexedGeo.attributes.position.needsUpdate = true;

        const partPos = pGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            partPos[i * 3] += velocities[i].x;
            partPos[i * 3 + 1] += velocities[i].y;
            partPos[i * 3 + 2] += velocities[i].z;
            if (partPos[i*3] > 15) velocities[i].x *= -1;
            if (partPos[i*3] < -15) velocities[i].x *= -1;
            if (partPos[i*3+1] > 15) velocities[i].y *= -1;
            if (partPos[i*3+1] < -15) velocities[i].y *= -1;
        }
        pGeometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (window.innerWidth < 768) { camera.position.z = 16; } else { camera.position.z = 10; }
    });

    window.update3DTheme = function(isLightMode) {
        const colorHex = isLightMode ? 0x000000 : 0xffffff;
        const fogColor = isLightMode ? 0xe0e0e0 : 0x000000;
        pMaterial.color.setHex(colorHex);
        icoMat.color.setHex(colorHex);
        scene.fog.color.setHex(fogColor);
        const blend = isLightMode ? THREE.NormalBlending : THREE.AdditiveBlending;
        pMaterial.blending = blend;
    };
})();


// --- 3. SWIPE SCROLL & OPTIMALIZÁLT BELSŐ GÖRGETÉS ---
gsap.registerPlugin(Observer);

const sections = document.querySelectorAll("section, .footer");
const totalSections = sections.length;
let currentIndex = 0;
let isAnimating = false;

gsap.set(sections, { zIndex: 0, autoAlpha: 0 });
gsap.set(sections[0], { zIndex: 1, autoAlpha: 1 });

function gotoSection(index, direction) {
    if (isAnimating || index < 0 || index >= totalSections) return;
    
    isAnimating = true;
    const currentSection = sections[currentIndex];
    const nextSection = sections[index];

    // Gömb robbanás effekt
    if (index > 0) {
        gsap.to(sphereAnimationParams, { explosion: 1, duration: 1.5, ease: "power2.inOut" });
    } else {
        gsap.to(sphereAnimationParams, { explosion: 0, duration: 1.5, ease: "power2.inOut" });
    }

    // Swipe Irány
    const enterFrom = direction === 1 ? 100 : -100;
    const leaveTo = direction === 1 ? -100 : 100;

    const tl = gsap.timeline({
        onComplete: () => {
            isAnimating = false;
            currentIndex = index;
            gsap.set(currentSection, { zIndex: 0, autoAlpha: 0 });
        }
    });

    gsap.set(nextSection, { zIndex: 2, autoAlpha: 1, yPercent: enterFrom });
    gsap.set(currentSection, { zIndex: 1 });

    tl.to(currentSection, { yPercent: leaveTo, duration: 1.0, ease: "power3.inOut" }, 0);
    tl.to(nextSection, { yPercent: 0, duration: 1.0, ease: "power3.inOut" }, 0);
}

// --- JAVÍTOTT OBSERVER: KÉNYELMES SEBESSÉG ---
// --- JAVÍTOTT OBSERVER: KÜLÖN MOBIL ÉRZÉKENYSÉG ---
Observer.create({
    target: window,
    type: "wheel,touch,pointer",
    wheelSpeed: -1, 
    tolerance: 10,
    preventDefault: true,

    onChange: (self) => {
        if (isAnimating) return;

        const delta = self.deltaY; 
        const scrollable = self.event.target.closest('.pages-grid');

        // MOBIL ÉRZÉKELÉS
        const isMobile = window.innerWidth < 768;
        
        // ITT ÁLLÍTSD AZ ERŐSSÉGET!
        // Ha mobil: 3.5 (könnyű görgetés), Ha gép: 1.5 (precíz görgetés)
        const scrollForce = isMobile ? 5.0 : 1.5; 

        // 1. ESET: KÁRTYÁK GÖRGETÉSE
        if (scrollable) {
            const maxScroll = scrollable.scrollHeight - scrollable.clientHeight;
            const currentScroll = scrollable.scrollTop;

            // LEFELÉ
            if (delta < 0) {
                if (currentScroll < maxScroll - 2) {
                    gsap.to(scrollable, {
                        scrollTop: currentScroll - (delta * scrollForce), // Itt használjuk a változót
                        duration: 0.5,
                        ease: "power3.out",
                        overwrite: true
                    });
                    return; 
                }
            } 
            // FELFELÉ
            else if (delta > 0) {
                if (currentScroll > 2) {
                    gsap.to(scrollable, {
                        scrollTop: currentScroll - (delta * scrollForce), // Itt is
                        duration: 0.5,
                        ease: "power3.out",
                        overwrite: true
                    });
                    return; 
                }
            }
        }

        // 2. ESET: LAPOZÁS
        if (delta < 0) {
            gotoSection(currentIndex + 1, 1); 
        } else {
            gotoSection(currentIndex - 1, -1); 
        }
    }
});


// --- UI ---
window.showUserUI = function (user, isAdmin) {
    const container = document.getElementById('auth-section');
    if (!container) return;
    const name = user.displayName || user.email.split('@')[0];
    container.innerHTML = `<span class="header-auth">${name} ${isAdmin ? '<span style="opacity:0.5">[ADMIN]</span>' : ''}</span>${isAdmin ? '<a href="admin.html" style="color:#fff;text-decoration:none;font-size:14px;"><i class="fa-solid fa-gear"></i></a>' : ''}<button class="btn-header" onclick="logoutUser()">KILÉPÉS</button>`;
};
window.showGuestUI = function () {
    const container = document.getElementById('auth-section');
    if (!container) return;
    container.innerHTML = `<a href="login.html" style="text-decoration:none"><button class="btn-header">BELÉPÉS</button></a>`;
};

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('real-time-clock');
    if(clockEl) clockEl.textContent = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
}
setInterval(updateClock, 1000);
updateClock();

// --- TÉMA ---
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

function applyTheme(isLight) {
    if (isLight) {
        body.classList.add('light-mode');
        if(themeToggle) themeToggle.innerText = 'LIGHT_MODE: ON';
    } else {
        body.classList.remove('light-mode');
        if(themeToggle) themeToggle.innerText = 'DARK_MODE: ON';
    }
    if (window.update3DTheme) window.update3DTheme(isLight);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const willBeLight = !body.classList.contains('light-mode');
        applyTheme(willBeLight);
    });
}

window.addEventListener('load', () => {
    localStorage.removeItem('theme'); 
    applyTheme(false); 
});