// ==========================================
// BOMBASZ - Exploding Sphere Navigation v9
// Better mobile visibility
// ==========================================

// --- KATEGÓRIÁK ADATAI ---
const categories = [
    {
        name: "ALOLDALAK",
        items: [
            { name: "Bombasz Chat", icon: "fa-comments", url: "social.html" },
            { name: "Könyvek", icon: "fa-book-open", url: "konyv.html" },
            { name: "Vids", icon: "fa-play", url: "vids.html" },
            { name: "UNCS (régi)", icon: "fa-check-double", url: "uncs.html" },
            { name: "UNCS (nagyon régi)", icon: "fa-check-double", url: "old.html" },
            { name: "Történelem", icon: "fa-landmark", url: "tori.html" },
            { name: "CBZ", icon: "fa-book-open", url: "cbz.html" },
        ]
    },
    {
        name: "JÁTÉKOK",
        items: [
            { name: "Mikulás", icon: "fa-gamepad", url: "mikulas.html" },
            { name: "FPS Shooter", icon: "fa-gamepad", url: "fps.html" },
            { name: "UFO Játék", icon: "fa-gamepad", url: "jatek.html" },
        ]
    },
    {
        name: "LETÖLTÉSEK",
        items: [
            { name: "Chat Setup", icon: "fa-download", url: "egyeb/Bombasz Chat Setup 1.0.1.exe", download: true },
            { name: "Chat Portable", icon: "fa-comments", url: "https://drive.google.com/file/d/1xuKcJ2v9WyYMUw6O1AZQhTnJWcihYFgV/view", external: true },
            { name: "Zene Letöltő", icon: "fa-music", url: "https://drive.google.com/file/d/1Ly64r0g0RMKuSsabj9iegmRgCB5U_8Ea/view", external: true },
            { name: "SRT Időzítő", icon: "fa-clock", url: "egyeb/sub.py", download: true },
            { name: "CBZ Tool", icon: "fa-chevron-up", url: "egyeb/cbz.py", download: true },
        ]
    }
];

// --- MOBIL DETEKTÁLÁS ---
const isMobile = window.innerWidth < 768;

// --- ÁLLAPOT ---
let currentLevel = 0;
let currentCategory = 0;
let hoveredItem = -1;
let isAnimating = false;
let scrollAccumulator = 0;
const SCROLL_THRESHOLD = isMobile ? 30 : 60;

// --- THREE.JS SETUP ---
const canvas = document.getElementById('hero-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = isMobile ? 12 : 10;

// --- ANIMATION PARAMS ---
let mainExplosion = 0;
let targetMainExplosion = 0;
let subExplosion = 0;
let targetSubExplosion = 0;

const LERP_SLOW = 0.06;
const LERP_MED = 0.1;
const LERP_FAST = 0.15;

// --- GÖMB GEOMETRIA ---
const sphereRadius = isMobile ? 1.8 : 2.5;
const baseGeo = new THREE.IcosahedronGeometry(sphereRadius, 2);
const nonIndexedGeo = baseGeo.toNonIndexed();
const posAttr = nonIndexedGeo.attributes.position;
const vertexCount = posAttr.count;
const triangleCount = vertexCount / 3;

// --- FRAGMENT CSOPORT ---
const fragmentGroup = new THREE.Group();
scene.add(fragmentGroup);

// --- FŐ DARABOK (GÚLÁK) ---
const mainFragments = [];
const mainFragmentGroup = new THREE.Group();
scene.add(mainFragmentGroup);

categories.forEach((cat, idx) => {
    const pyramidGeo = new THREE.TetrahedronGeometry(isMobile ? 0.35 : 0.5, 0);
    const pyramidMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0
    });
    const pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    
    const angle = (idx / categories.length) * Math.PI * 2;
    const explosionDir = new THREE.Vector3(
        Math.cos(angle) * 0.8,
        Math.sin(angle) * 0.5,
        (Math.random() - 0.5) * 0.3
    ).normalize();
    
    mainFragments.push({
        mesh: pyramid,
        explosionDir,
        // KISEBB távolság mobilon
        explosionDistance: isMobile ? 4 : 8 + Math.random() * 3,
        rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        rotationSpeed: 0.008 + Math.random() * 0.008,
        currentOpacity: 0,
        targetOpacity: 0,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 0.5,
        // KISEBB lebegés mobilon
        floatAmount: isMobile ? 0.1 : 0.3 + Math.random() * 0.2
    });
    
    mainFragmentGroup.add(pyramid);
});

// --- GÖMB DARABOK ---
const fragments = [];

for (let i = 0; i < triangleCount; i++) {
    const idx = i * 3;
    
    const v1 = new THREE.Vector3(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx));
    const v2 = new THREE.Vector3(posAttr.getX(idx + 1), posAttr.getY(idx + 1), posAttr.getZ(idx + 1));
    const v3 = new THREE.Vector3(posAttr.getX(idx + 2), posAttr.getY(idx + 2), posAttr.getZ(idx + 2));
    
    const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
    
    const triGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        v1.x - center.x, v1.y - center.y, v1.z - center.z,
        v2.x - center.x, v2.y - center.y, v2.z - center.z,
        v3.x - center.x, v3.y - center.y, v3.z - center.z,
    ]);
    triGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    const pyramidGeo = new THREE.TetrahedronGeometry(isMobile ? 0.08 : 0.1, 0);
    
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(triGeo, material);
    mesh.position.copy(center);
    
    const originalRotation = mesh.rotation.clone();
    
    const explosionDir = center.clone().normalize();
    explosionDir.x += (Math.random() - 0.5) * 0.5;
    explosionDir.y += (Math.random() - 0.5) * 0.5;
    explosionDir.z += (Math.random() - 0.5) * 0.5;
    explosionDir.normalize();
    
    fragments.push({
        mesh,
        triGeo,
        pyramidGeo,
        originalPos: center.clone(),
        originalRotation,
        explosionDir,
        // KISEBB robbanás távolság mobilon
        explosionDistance: isMobile ? 2.5 + Math.random() * 2 : 4 + Math.random() * 5,
        rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        rotationSpeed: (Math.random() - 0.5) * 0.015,
        currentGeometry: 'tri',
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
        // KISEBB lebegés mobilon
        floatAmount: isMobile ? 0.05 : 0.15 + Math.random() * 0.1
    });
    
    fragmentGroup.add(mesh);
}

// --- KATEGÓRIA SUB-DARABOK ---
const categorySubFragments = [];
const labelsContainer = document.getElementById('labels-container');

categories.forEach((cat, catIdx) => {
    const subFrags = [];
    const itemCount = cat.items.length;
    
    cat.items.forEach((item, itemIdx) => {
        const angle = (itemIdx / itemCount) * Math.PI * 2 - Math.PI / 2;
        
        const subGeo = new THREE.TetrahedronGeometry(isMobile ? 0.12 : 0.18, 0);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0
        });
        const mesh = new THREE.Mesh(subGeo, material);
        
        const localPos = new THREE.Vector3(
            Math.cos(angle) * 0.15,
            Math.sin(angle) * 0.15,
            0
        );
        
        const explodeDir = new THREE.Vector3(
            Math.cos(angle),
            Math.sin(angle),
            (Math.random() - 0.5) * 0.3
        ).normalize();
        
        const label = document.createElement('a');
        label.className = 'item-label';
        label.innerHTML = `<i class="fa-solid ${item.icon}"></i><span>${item.name}</span>`;
        label.href = item.url;
        if (item.download) {
            label.setAttribute('download', '');
        } else if (item.external) {
            label.setAttribute('target', '_blank');
        }
        // Belső linkeknek nincs target="_blank" - ezeket a transition.js kezeli
        label.style.opacity = '0';
        label.style.pointerEvents = 'none';
        
        label.addEventListener('mouseenter', () => { hoveredItem = itemIdx; });
        label.addEventListener('mouseleave', () => { if (hoveredItem === itemIdx) hoveredItem = -1; });
        label.addEventListener('touchstart', (e) => { 
            hoveredItem = itemIdx; 
        }, { passive: true });
        
        labelsContainer.appendChild(label);
        
        subFrags.push({
            mesh,
            localPos,
            explodeDir,
            // KISEBB item robbanás mobilon
            explosionDistance: isMobile ? 1.2 : 2 + Math.random() * 0.5,
            itemData: item,
            label,
            rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
            rotationSpeed: 0.015 + Math.random() * 0.01,
            currentOpacity: 0
        });
        
        scene.add(mesh);
    });
    
    categorySubFragments.push(subFrags);
});

// --- HÁTTÉR RÉSZECSKÉK ---
const particleCount = isMobile ? 800 : 2500;
const pPositions = new Float32Array(particleCount * 3);
const pVelocities = [];

for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 150;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 150;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 150;
    pVelocities.push({
        x: (Math.random() - 0.5) * 0.03,
        y: (Math.random() - 0.5) * 0.03,
        z: (Math.random() - 0.5) * 0.03
    });
}

const pGeometry = new THREE.BufferGeometry();
pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const pMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: isMobile ? 0.03 : 0.02,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(pGeometry, pMaterial);
scene.add(particles);

// --- HELPER ---
function worldToScreen(pos) {
    const vector = pos.clone().project(camera);
    return {
        x: (vector.x * 0.5 + 0.5) * window.innerWidth,
        y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
        z: vector.z
    };
}

// --- UI ---
function updateUI() {
    const heroOverlay = document.getElementById('hero-overlay');
    const categoryLabel = document.getElementById('category-label');
    
    if (currentLevel === 0) {
        heroOverlay.classList.remove('hidden');
        categoryLabel.classList.remove('visible');
    } else {
        heroOverlay.classList.add('hidden');
        categoryLabel.textContent = categories[currentCategory].name;
        categoryLabel.classList.add('visible');
    }
}

// --- KAMERA ---
let cameraPos = new THREE.Vector3(0, 0, isMobile ? 12 : 10);
let targetCameraPos = new THREE.Vector3(0, 0, isMobile ? 12 : 10);
let lookAtPos = new THREE.Vector3(0, 0, 0);
let targetLookAt = new THREE.Vector3(0, 0, 0);

function updateCamera() {
    if (currentLevel === 0) {
        targetCameraPos.set(0, 0, isMobile ? 12 : 10);
        targetLookAt.set(0, 0, 0);
    } else {
        // Mobilon közelebb a kamera
        const zoomLevel1 = isMobile ? 6 : 6;
        const zoomLevel2 = isMobile ? 4.5 : 4.5;
        targetCameraPos.set(0, 0, currentLevel === 1 ? zoomLevel1 : zoomLevel2);
        targetLookAt.set(0, 0, 0);
    }
}

// --- NAVIGÁCIÓ ---
let navTimeout = null;

function navigate(direction) {
    if (isAnimating) return;
    
    if (navTimeout) clearTimeout(navTimeout);
    isAnimating = true;
    
    if (currentLevel === 0) {
        if (direction > 0) {
            currentLevel = 1;
            currentCategory = 0;
            targetMainExplosion = 1;
            updateCamera();
            updateUI();
        }
    } 
    else if (currentLevel === 1) {
        if (direction > 0) {
            currentLevel = 2;
            targetSubExplosion = 1;
            updateCamera();
            updateUI();
        } else if (direction < 0) {
            if (currentCategory > 0) {
                currentCategory--;
                updateCamera();
                updateUI();
            } else {
                currentLevel = 0;
                targetMainExplosion = 0;
                targetSubExplosion = 0;
                updateCamera();
                updateUI();
            }
        }
    }
    else if (currentLevel === 2) {
        if (direction > 0) {
            if (currentCategory < categories.length - 1) {
                targetSubExplosion = 0;
                navTimeout = setTimeout(() => {
                    currentCategory++;
                    currentLevel = 1;
                    updateCamera();
                    updateUI();
                }, 250);
            }
        } else if (direction < 0) {
            targetSubExplosion = 0;
            navTimeout = setTimeout(() => {
                if (currentCategory > 0) {
                    currentCategory--;
                    targetSubExplosion = 1;
                    updateCamera();
                    updateUI();
                } else {
                    currentLevel = 1;
                    updateCamera();
                    updateUI();
                }
            }, 250);
        }
    }
    
    setTimeout(() => {
        isAnimating = false;
    }, 250);
}

// --- SCROLL ---
window.addEventListener('wheel', (e) => {
    e.preventDefault();
    scrollAccumulator += e.deltaY;
    
    if (Math.abs(scrollAccumulator) > SCROLL_THRESHOLD) {
        navigate(scrollAccumulator > 0 ? 1 : -1);
        scrollAccumulator = 0;
    }
}, { passive: false });

// --- TOUCH (javított) ---
let touchStartY = 0;
let touchStartTime = 0;

window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
}, { passive: true });

window.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const deltaY = touchStartY - touchEndY;
    const deltaTime = touchEndTime - touchStartTime;
    
    // Swipe - érzékenyebb mobilon
    if (deltaTime < 400 && Math.abs(deltaY) > 20) {
        navigate(deltaY > 0 ? 1 : -1);
    }
}, { passive: true });

// --- KEYBOARD ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        navigate(1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigate(-1);
    }
});

// --- EGÉR PARALLAX ---
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// --- IDŐ ---
let time = 0;

// --- ANIMÁCIÓS LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
    time += 0.016;
    
    mainExplosion += (targetMainExplosion - mainExplosion) * LERP_MED;
    subExplosion += (targetSubExplosion - subExplosion) * LERP_MED;
    
    cameraPos.lerp(targetCameraPos, LERP_SLOW);
    lookAtPos.lerp(targetLookAt, LERP_SLOW);
    
    camera.position.copy(cameraPos);
    camera.lookAt(lookAtPos);
    
    // Parallax
    if (currentLevel === 0 && !isMobile) {
        fragmentGroup.rotation.x += (mouseY * 0.15 - fragmentGroup.rotation.x) * 0.02;
        fragmentGroup.rotation.y += (mouseX * 0.15 - fragmentGroup.rotation.y) * 0.02;
    }
    fragmentGroup.rotation.z += 0.0002;
    
    // --- GÖMB DARABOK ---
    fragments.forEach((frag) => {
        if (mainExplosion > 0.5 && frag.currentGeometry !== 'pyramid') {
            frag.mesh.geometry = frag.pyramidGeo;
            frag.currentGeometry = 'pyramid';
        } else if (mainExplosion <= 0.5 && frag.currentGeometry !== 'tri') {
            frag.mesh.geometry = frag.triGeo;
            frag.currentGeometry = 'tri';
        }
        
        let targetPos = frag.originalPos.clone().add(
            frag.explosionDir.clone().multiplyScalar(frag.explosionDistance * mainExplosion)
        );
        
        if (mainExplosion > 0.5) {
            targetPos.x += Math.sin(time * frag.floatSpeed + frag.floatOffset) * frag.floatAmount;
            targetPos.y += Math.cos(time * frag.floatSpeed * 0.7 + frag.floatOffset) * frag.floatAmount;
            targetPos.z += Math.sin(time * frag.floatSpeed * 0.5 + frag.floatOffset) * frag.floatAmount * 0.5;
        }
        
        frag.mesh.position.lerp(targetPos, LERP_MED);
        
        if (mainExplosion < 0.1) {
            frag.mesh.rotation.x += (frag.originalRotation.x - frag.mesh.rotation.x) * LERP_MED;
            frag.mesh.rotation.y += (frag.originalRotation.y - frag.mesh.rotation.y) * LERP_MED;
            frag.mesh.rotation.z += (frag.originalRotation.z - frag.mesh.rotation.z) * LERP_MED;
        } else {
            frag.mesh.rotateOnAxis(frag.rotationAxis, frag.rotationSpeed * mainExplosion);
        }
        
        const targetOpacity = mainExplosion > 0.3 ? 0.1 : 0.25;
        frag.mesh.material.opacity += (targetOpacity - frag.mesh.material.opacity) * LERP_FAST;
    });
    
    // --- FŐ DARABOK ---
    mainFragments.forEach((frag, idx) => {
        const isActive = idx === currentCategory;
        
        let targetPos;
        if (currentLevel === 0) {
            targetPos = new THREE.Vector3(0, 0, 0);
            frag.targetOpacity = 0;
        } else if (isActive) {
            targetPos = new THREE.Vector3(0, 0, 0);
            frag.targetOpacity = 0.9;
        } else {
            const basePos = frag.explosionDir.clone().multiplyScalar(frag.explosionDistance);
            targetPos = basePos.clone();
            targetPos.x += Math.sin(time * frag.floatSpeed + frag.floatOffset) * frag.floatAmount;
            targetPos.y += Math.cos(time * frag.floatSpeed * 0.8 + frag.floatOffset) * frag.floatAmount;
            targetPos.z += Math.sin(time * frag.floatSpeed * 0.6 + frag.floatOffset) * frag.floatAmount * 0.5;
            frag.targetOpacity = 0.25;
        }
        
        frag.mesh.position.lerp(targetPos, LERP_MED);
        frag.currentOpacity += (frag.targetOpacity - frag.currentOpacity) * LERP_FAST;
        frag.mesh.material.opacity = frag.currentOpacity;
        
        if (frag.currentOpacity > 0.05) {
            frag.mesh.rotateOnAxis(frag.rotationAxis, frag.rotationSpeed);
        }
    });
    
    // --- SUB-FRAGMENT-EK ---
    categorySubFragments.forEach((subFrags, catIdx) => {
        const isActiveCategory = catIdx === currentCategory;
        const shouldShow = isActiveCategory && currentLevel === 2;
        const mainPos = new THREE.Vector3(0, 0, 0);
        
        subFrags.forEach((sub, itemIdx) => {
            let pos = mainPos.clone().add(sub.localPos);
            
            if (shouldShow) {
                const explodeOffset = sub.explodeDir.clone().multiplyScalar(sub.explosionDistance * subExplosion);
                pos.add(explodeOffset);
            }
            
            sub.mesh.position.lerp(pos, LERP_MED);
            
            let targetOpacity = 0;
            if (shouldShow && subExplosion > 0.3) {
                targetOpacity = itemIdx === hoveredItem ? 1 : 0.7;
            }
            sub.currentOpacity += (targetOpacity - sub.currentOpacity) * LERP_FAST;
            sub.mesh.material.opacity = sub.currentOpacity;
            
            if (sub.currentOpacity > 0.05) {
                sub.mesh.rotateOnAxis(sub.rotationAxis, sub.rotationSpeed);
            }
            
            const screenPos = worldToScreen(sub.mesh.position);
            sub.label.style.left = screenPos.x + 'px';
            sub.label.style.top = screenPos.y + 'px';
            
            if (shouldShow && subExplosion > 0.5) {
                sub.label.style.opacity = sub.currentOpacity;
                sub.label.style.pointerEvents = sub.currentOpacity > 0.3 ? 'auto' : 'none';
                sub.label.classList.toggle('active', itemIdx === hoveredItem);
            } else {
                sub.label.style.opacity = '0';
                sub.label.style.pointerEvents = 'none';
                sub.label.classList.remove('active');
            }
        });
    });
    
    // --- HÁTTÉR RÉSZECSKÉK ---
    const partPos = pGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        partPos[i * 3] += pVelocities[i].x;
        partPos[i * 3 + 1] += pVelocities[i].y;
        partPos[i * 3 + 2] += pVelocities[i].z;
        
        const bound = 75;
        if (partPos[i * 3] > bound || partPos[i * 3] < -bound) {
            partPos[i * 3] = (Math.random() - 0.5) * bound * 2;
        }
        if (partPos[i * 3 + 1] > bound || partPos[i * 3 + 1] < -bound) {
            partPos[i * 3 + 1] = (Math.random() - 0.5) * bound * 2;
        }
        if (partPos[i * 3 + 2] > bound || partPos[i * 3 + 2] < -bound) {
            partPos[i * 3 + 2] = (Math.random() - 0.5) * bound * 2;
        }
    }
    pGeometry.attributes.position.needsUpdate = true;
    
    renderer.render(scene, camera);
}

animate();

// --- RESIZE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- ÓRA ---
function updateClock() {
    const el = document.getElementById('real-time-clock');
    if (el) {
        el.textContent = new Intl.DateTimeFormat('hu-HU', {
            timeZone: 'Europe/Budapest',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date());
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- AUTH UI ---
window.showUserUI = function(user, isAdmin) {
    const container = document.getElementById('auth-section');
    if (!container) return;
    const name = user.displayName || user.email.split('@')[0];
    container.innerHTML = `
        <span class="header-auth">${name} ${isAdmin ? '<span style="opacity:0.5">[ADMIN]</span>' : ''}</span>
        ${isAdmin ? '<a href="admin.html" style="color:#fff;text-decoration:none;font-size:14px;"><i class="fa-solid fa-gear"></i></a>' : ''}
        <button class="btn-header" onclick="logoutUser()">KILÉPÉS</button>
    `;
};

window.showGuestUI = function() {
    const container = document.getElementById('auth-section');
    if (!container) return;
    container.innerHTML = `<a href="login.html" style="text-decoration:none"><button class="btn-header">BELÉPÉS</button></a>`;
};