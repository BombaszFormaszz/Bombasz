// ==========================================
// BOMBASZ - Exploding Navigation v24
// IMPROVEMENTS: Linear nav, proper scroll, back to intro
// + háttér gúlák nagyobbak robbanás után
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
            { name: "UNCS (ős)", icon: "fa-check-double", url: "old.html" },
            { name: "Történelem", icon: "fa-landmark", url: "tori.html" },
            { name: "CBZ Olvasó", icon: "fa-book-open", url: "cbz.html" },
        ]
    },
    {
        name: "JÁTÉKOK",
        items: [
            { name: "Mikulás", icon: "fa-gamepad", url: "mikulas.html" },
            { name: "FPS Shooter", icon: "fa-crosshairs", url: "fps.html" },
            { name: "UFO Játék", icon: "fa-rocket", url: "jatek.html" },
        ]
    },
    {
        name: "LETÖLTÉSEK",
        items: [
            { name: "Chat Setup", icon: "fa-download", url: "egyeb/Bombasz Chat Setup 1.0.1.exe", download: true },
            { name: "Chat Portable", icon: "fa-box-archive", url: "https://drive.google.com/file/d/1xuKcJ2v9WyYMUw6O1AZQhTnJWcihYFgV/view", external: true },
            { name: "Zene Letöltő", icon: "fa-music", url: "https://drive.google.com/file/d/1Ly64r0g0RMKuSsabj9iegmRgCB5U_8Ea/view", external: true },
            { name: "SRT Időzítő", icon: "fa-clock", url: "egyeb/sub.py", download: true },
            { name: "CBZ Tool", icon: "fa-file-zipper", url: "egyeb/cbz.py", download: true },
        ]
    }
];

// --- MOBIL DETEKTÁLÁS ---
const isMobile = window.innerWidth < 768;

// --- ÁLLAPOT ---
let currentLevel = 0; // 0: Intro, 1: Menu (linear), 2: SubItems
let currentCategory = 0;
let targetCategory = 0;
let hoveredItem = -1;

let isAnimating = false;
let scrollAccumulator = 0;
const SCROLL_THRESHOLD = isMobile ? 30 : 45; 

// --- THREE.JS SETUP ---
const canvas = document.getElementById('hero-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

camera.position.z = isMobile ? 12 : 10;

// --- ANIMATION PARAMS ---
let mainExplosion = 0;
let targetMainExplosion = 0;
let subExplosion = 0;
let targetSubExplosion = 0;

const LERP_SLOW  = 0.08;
const LERP_MED   = 0.12;
const LERP_FAST  = 0.2;

// --- HÁTTÉR GÖMB ---
const sphereRadius = isMobile ? 2.0 : 2.5;
const baseGeo = new THREE.IcosahedronGeometry(sphereRadius, 2); 
const nonIndexedGeo = baseGeo.toNonIndexed();
const posAttr = nonIndexedGeo.attributes.position;
const triangleCount = posAttr.count / 3;

// --- CSOPORTOK ---
const backgroundGroup = new THREE.Group();
const menuGroup = new THREE.Group();
const subItemGroup = new THREE.Group();

scene.add(backgroundGroup);
scene.add(menuGroup);
scene.add(subItemGroup);

// --- KATEGÓRIA GÚLÁK (LINEAR MENU) ---
const mainFragments = [];
const VERTICAL_SPACING = isMobile ? 4.0 : 5.5;

categories.forEach((cat, idx) => {
    const pyramidGeo = new THREE.TetrahedronGeometry(isMobile ? 0.8 : 0.7, 0);
    const pyramidMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        wireframe: true,
        transparent: true, 
        opacity: 0,
        side: THREE.DoubleSide
    });
    
    const fillGeo = new THREE.TetrahedronGeometry(isMobile ? 0.75 : 0.65, 0);
    const hitMesh = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ visible: false }));
    
    const pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    pyramid.add(hitMesh);
    
    const centerIdx = Math.floor(categories.length / 2);
    const yPos = (centerIdx - idx) * VERTICAL_SPACING;
    
    const zigzagOffset = isMobile ? 1.5 : 2.5;
    const xPos = (idx % 2 === 0) ? -zigzagOffset : zigzagOffset;
    
    pyramid.position.set(xPos, yPos, 0);
    pyramid.lookAt(camera.position);
    
    mainFragments.push({
        mesh: pyramid,
        hitMesh: hitMesh,
        baseY: yPos,
        baseX: xPos,
        rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        rotationSpeed: 0.005,
        currentOpacity: 0,
        targetOpacity: 0
    });
    
    menuGroup.add(pyramid);
});

// --- HÁTTÉR DARABOK ---
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
    
    // JAVÍTÁS itt: nagyobb gúlák robbanás után
    const pyramidGeo = new THREE.TetrahedronGeometry(isMobile ? 0.14 : 0.24, 0);
    
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.2, 
        side: THREE.DoubleSide 
    });
    const mesh = new THREE.Mesh(triGeo, material);
    mesh.position.copy(center);
    
    fragments.push({
        mesh,
        triGeo,
        pyramidGeo,
        originalPos: center.clone(),
        originalRotation: mesh.rotation.clone(),
        explosionDir: center.clone().normalize(),
        explosionDistance: isMobile ? 5.5 : 8.0,
        rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        rotationSpeed: (Math.random()-0.5)*0.015,
        currentGeometry: 'tri',
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.1 + Math.random() * 0.2,
        floatVector: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize()
    });
    backgroundGroup.add(mesh);
}

// --- ALOLDALAK (SUB-ITEMS) ---
const categorySubFragments = [];
const labelsContainer = document.getElementById('labels-container');

categories.forEach((cat, catIdx) => {
    const subFrags = [];
    const itemCount = cat.items.length;
    
    cat.items.forEach((item, itemIdx) => {
        let targetX, targetY, targetZ;
        
        if (isMobile) {
            const spacing = 1.3;
            const totalHeight = (itemCount - 1) * spacing;
            const startY = totalHeight / 2;
            targetX = 0; 
            targetY = startY - (itemIdx * spacing); 
            targetZ = 2.0; 
        } else {
            const angleStep = (Math.PI * 2) / itemCount;
            const angle = -Math.PI / 2 + (itemIdx * angleStep);
            const radius = 3.2;
            targetX = Math.cos(angle) * radius; 
            targetY = Math.sin(angle) * radius; 
            targetZ = 0;
        }

        const finalPosition = new THREE.Vector3(targetX, targetY, targetZ);
        const subGeo = new THREE.TetrahedronGeometry(isMobile ? 0.15 : 0.2, 0);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            wireframe: true, 
            transparent: true, 
            opacity: 0 
        });
        const mesh = new THREE.Mesh(subGeo, material);
        
        const label = document.createElement('a');
        label.className = 'item-label';
        label.innerHTML = `<i class="fa-solid ${item.icon}"></i><span>${item.name}</span>`;
        label.href = item.url;
        if (item.download) {
            label.setAttribute('download', '');
        } else if (!item.external) {
            label.addEventListener('click', (e) => {
                e.preventDefault();
                smoothPageTransition(item.url);
            });
        } else {
            label.setAttribute('target', '_blank');
        }
        
        label.style.opacity = '0';
        label.style.pointerEvents = 'none';
        
        label.addEventListener('mouseenter', () => { hoveredItem = itemIdx; });
        label.addEventListener('mouseleave', () => { if (hoveredItem === itemIdx) hoveredItem = -1; });
        label.addEventListener('touchstart', () => { hoveredItem = itemIdx; }, { passive: true });
        
        labelsContainer.appendChild(label);
        
        subFrags.push({
            mesh, 
            finalPosition, 
            label,
            rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
            rotationSpeed: 0.04,
            currentOpacity: 0
        });
        subItemGroup.add(mesh);
    });
    categorySubFragments.push(subFrags);
});

// --- PORSZEMEK ---
const particleCount = isMobile ? 1500 : 4000;
const pPositions = new Float32Array(particleCount * 3);
const pVelocities = [];
for (let i = 0; i < particleCount; i++) {
    const spread = isMobile ? 90 : 150;
    pPositions[i*3] = (Math.random()-0.5) * spread;
    pPositions[i*3+1] = (Math.random()-0.5) * spread;
    pPositions[i*3+2] = (Math.random()-0.5) * spread;
    pVelocities.push({ 
        x: (Math.random()-0.5)*0.02, 
        y: (Math.random()-0.5)*0.02, 
        z: (Math.random()-0.5)*0.02 
    });
}
const pGeometry = new THREE.BufferGeometry();
pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const pMaterial = new THREE.PointsMaterial({ 
    color: 0xffffff, 
    size: isMobile ? 0.03 : 0.02, 
    transparent: true, 
    opacity: 0.6 
});
const particles = new THREE.Points(pGeometry, pMaterial);
scene.add(particles);

// --- HELPER ---
let isTransitioning = false;

function smoothPageTransition(url) {
    if (isTransitioning) return;
    isTransitioning = true;
    
    sessionStorage.setItem('bombasz_returning', 'true');
    sessionStorage.setItem('bombasz_level', currentLevel);
    sessionStorage.setItem('bombasz_category', currentCategory);
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: #ffffff;
        z-index: 9999999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53);
        will-change: opacity;
    `;
    document.body.appendChild(overlay);

    canvas.style.transition = 'transform 0.6s cubic-bezier(0.7, 0, 0.3, 1), filter 0.6s ease';
    canvas.style.willChange = 'transform, filter';
    
    const labels = document.querySelectorAll('.item-label');
    labels.forEach(l => l.style.opacity = '0');
    const catLabel = document.getElementById('category-label');
    if(catLabel) catLabel.style.opacity = '0';

    requestAnimationFrame(() => {
        canvas.style.transform = 'scale(3)';
        canvas.style.filter = 'blur(10px)';
        
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 50);

        setTimeout(() => {
            window.location.href = url;
        }, 450);
    });
}

function handleBackNavigation() {
    if (sessionStorage.getItem('bombasz_returning') === 'true') {
        sessionStorage.removeItem('bombasz_returning');
        
        const savedLevel = parseInt(sessionStorage.getItem('bombasz_level')) || 1;
        const savedCategory = parseInt(sessionStorage.getItem('bombasz_category')) || 0;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #ffffff; z-index: 9999999; opacity: 1;
            transition: opacity 0.8s ease-out; pointer-events: none;
        `;
        document.body.appendChild(overlay);

        canvas.style.transition = 'none';
        canvas.style.transform = 'scale(5)'; 
        canvas.style.filter = 'blur(0px)'; 

        currentLevel = savedLevel;
        targetMainExplosion = 1; mainExplosion = 1;
        if (savedLevel === 2) {
            currentCategory = savedCategory; targetCategory = savedCategory;
            targetSubExplosion = 1; subExplosion = 1;
        } else {
            targetCategory = savedCategory;
        }
        updateUI();

        requestAnimationFrame(() => {
            setTimeout(() => {
                overlay.style.opacity = '0';
                
                canvas.style.transition = 'transform 1s cubic-bezier(0.19, 1, 0.22, 1)';
                canvas.style.transform = 'scale(1)';
                
                setTimeout(() => overlay.remove(), 1000);
            }, 50);
        });
    }
}

window.addEventListener('load', handleBackNavigation);

function createBackButton() {
    if (sessionStorage.getItem('bombasz_returning') !== 'true') {
        return null;
    }
    
    const backBtn = document.createElement('button');
    backBtn.id = 'bombasz-back-btn';
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> VISSZA';
    backBtn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        padding: 12px 24px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        z-index: 999999;
        backdrop-filter: blur(10px);
        border-radius: 8px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    backBtn.addEventListener('mouseenter', () => {
        backBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        backBtn.style.transform = 'translateX(-5px)';
    });
    
    backBtn.addEventListener('mouseleave', () => {
        backBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        backBtn.style.transform = 'translateX(0)';
    });
    
    backBtn.addEventListener('click', () => {
        sessionStorage.setItem('bombasz_returning', 'true');
        sessionStorage.setItem('bombasz_level', '1');
        sessionStorage.setItem('bombasz_category', '0');
        
        const pageContent = document.body;
        pageContent.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        pageContent.style.transform = 'scale(2.5)';
        pageContent.style.opacity = '1';
        
        setTimeout(() => {
            pageContent.style.filter = 'blur(5px)';
        }, 150);
        
        setTimeout(() => {
            pageContent.style.transition = 'all 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
            pageContent.style.transform = 'scale(8)';
            pageContent.style.filter = 'blur(20px)';
        }, 300);
        
        setTimeout(() => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(0,0,0,1) 70%);
                z-index: 9999999;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease-out;
            `;
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 300);
        }, 600);
    });
    
    document.body.appendChild(backBtn);
    return backBtn;
}

function worldToScreen(pos) {
    const vector = pos.clone().project(camera);
    let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    let y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    if (isMobile) {
        const margin = 20; 
        x = Math.max(margin, Math.min(window.innerWidth - margin, x));
        y = Math.max(90, Math.min(window.innerHeight - 70, y));
    }
    return { x, y };
}

function updateUI() {
    const heroOverlay = document.getElementById('hero-overlay');
    const categoryLabel = document.getElementById('category-label');
    
    if (currentLevel === 0) {
        heroOverlay.classList.remove('hidden'); 
        categoryLabel.classList.remove('visible');
    } 
    else if (currentLevel === 1) {
        heroOverlay.classList.add('hidden');
        categoryLabel.textContent = categories[targetCategory].name;
        categoryLabel.classList.add('visible');
        categoryLabel.style.opacity = "1";
    }
    else if (currentLevel === 2) {
        heroOverlay.classList.add('hidden');
        categoryLabel.textContent = categories[currentCategory].name;
        categoryLabel.classList.add('visible');
    }
}

function handleScroll(delta) {
    if (isAnimating) return;
    
    if (currentLevel === 0) {
        if (delta > 0) {
            currentLevel = 1;
            targetMainExplosion = 1;
            updateUI();
        }
        return;
    }
    
    if (currentLevel === 1) {
        if (delta < 0) {
            if (targetCategory > 0) {
                targetCategory--;
                updateUI();
            } else {
                currentLevel = 0;
                targetMainExplosion = 0;
                targetCategory = 0;
                updateUI();
            }
        } else {
            if (targetCategory < categories.length - 1) {
                targetCategory++;
                updateUI();
            }
        }
    }
    
    if (currentLevel === 2) {
        currentLevel = 1;
        targetSubExplosion = 0;
        updateUI();
        return;
    }
}

function handleClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (currentLevel === 0) {
        handleScroll(1);
        return;
    }

    if (currentLevel === 1) {
        raycaster.setFromCamera(mouse, camera);
        const hitBoxes = mainFragments.map(f => f.hitMesh);
        const intersects = raycaster.intersectObjects(hitBoxes);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object.parent;
            const clickedIndex = mainFragments.findIndex(f => f.mesh === clickedMesh);

            if (clickedIndex !== -1) {
                if (clickedIndex === targetCategory) {
                    enterCategory(clickedIndex);
                } else {
                    targetCategory = clickedIndex;
                    updateUI();
                }
            }
        }
    }
}

function enterCategory(index) {
    if (isAnimating) return;
    currentCategory = index;
    currentLevel = 2;
    targetSubExplosion = 1;
    updateUI();
}

// --- EVENT LISTENERS ---
window.addEventListener('wheel', (e) => {
    scrollAccumulator += e.deltaY;
    if (Math.abs(scrollAccumulator) > SCROLL_THRESHOLD) { 
        handleScroll(scrollAccumulator > 0 ? 1 : -1); 
        scrollAccumulator = 0; 
    }
}, {passive:false});

let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('mousedown', (e) => {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
});

window.addEventListener('mouseup', (e) => {
    const dist = Math.abs(e.clientX - touchStartX) + Math.abs(e.clientY - touchStartY);
    if (dist < 10) {
        handleClick(e);
    }
});

window.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, {passive: true});

window.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;
    
    if (Math.abs(deltaY) > 30) {
        handleScroll(deltaY > 0 ? 1 : -1);
    } 
    else if (Math.abs(deltaY) < 10 && Math.abs(deltaX) < 10) {
        const fakeEvent = {
            clientX: touchEndX,
            clientY: touchEndY
        };
        handleClick(fakeEvent);
    }
}, {passive: true});

// --- ANIMÁCIÓ ---
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.016;
    
    mainExplosion += (targetMainExplosion - mainExplosion) * LERP_SLOW;
    subExplosion += (targetSubExplosion - subExplosion) * LERP_SLOW;

    backgroundGroup.rotation.z += 0.0001;
    fragments.forEach(frag => {
        // Geometria váltás - most már a nagyobb pyramidGeo van használva
        if (mainExplosion > 0.5 && frag.currentGeometry !== 'pyramid') { 
            frag.mesh.geometry = frag.pyramidGeo; 
            frag.currentGeometry = 'pyramid'; 
        }
        else if (mainExplosion <= 0.5 && frag.currentGeometry !== 'tri') { 
            frag.mesh.geometry = frag.triGeo; 
            frag.currentGeometry = 'tri'; 
        }
        
        let tPos = frag.originalPos.clone().add(
            frag.explosionDir.clone().multiplyScalar(frag.explosionDistance * mainExplosion)
        );
        if (mainExplosion > 0.5) {
            tPos.add(
                frag.floatVector.clone().multiplyScalar(
                    Math.sin(time * frag.floatSpeed + frag.floatPhase) * 0.3
                )
            );
        }
        
        frag.mesh.position.lerp(tPos, LERP_MED);
        if (mainExplosion < 0.1) {
            frag.mesh.rotation.copy(frag.originalRotation);
        } else {
            frag.mesh.rotateOnAxis(frag.rotationAxis, frag.rotationSpeed * mainExplosion);
        }
        frag.mesh.material.opacity += ((mainExplosion > 0.3 ? 0.15 : 0.3) - frag.mesh.material.opacity) * LERP_FAST;
    });

    const targetGroupY = mainFragments[targetCategory].baseY;
    menuGroup.position.y += (-targetGroupY - menuGroup.position.y) * LERP_SLOW;
    
    mainFragments.forEach((frag, idx) => {
        let tScale = 1;
        let tOpacity = 0;
        
        if (currentLevel === 0) {
            tOpacity = 0;
        } 
        else if (currentLevel === 1) {
            if (idx === targetCategory) {
                tOpacity = 1;
            } else {
                tOpacity = 0.3;
            }
            tScale = 1;
            
            const floatX = Math.sin(time * 0.8 + idx * 0.5) * 0.15;
            const floatY = Math.sin(time * 1.0 + idx) * 0.2;
            frag.mesh.position.x = frag.baseX + floatX;
            frag.mesh.position.y = frag.baseY + floatY;
            
            frag.mesh.rotation.y += 0.005;
            frag.mesh.rotation.x += 0.002;
        } 
        else if (currentLevel === 2) {
            if (idx === currentCategory) {
                tScale = 1 - subExplosion; 
                tOpacity = tScale; 
            } else {
                tOpacity = 0.1;
                tScale = 1;
            }
        }
        
        frag.currentOpacity += (tOpacity - frag.currentOpacity) * LERP_MED;
        frag.mesh.material.opacity = frag.currentOpacity;
        frag.mesh.scale.setScalar(tScale);
    });
    
    menuGroup.scale.setScalar(mainExplosion);

    categorySubFragments.forEach((subFrags, catIdx) => {
        const isActiveCategory = catIdx === currentCategory;
        const shouldShow = isActiveCategory && (currentLevel === 2 || subExplosion > 0.01);
        
        subFrags.forEach((sub, itemIdx) => {
            let currentTarget = new THREE.Vector3(0, 0, 0);
            
            if (shouldShow) {
                currentTarget.copy(sub.finalPosition).multiplyScalar(subExplosion);
                
                let tOp = (itemIdx === hoveredItem) ? 1 : 0.9;
                sub.currentOpacity += (tOp - sub.currentOpacity) * 0.2;
                
                let scale = Math.min(1, subExplosion * 1.2);
                sub.mesh.scale.setScalar(scale);
                
                const spinFactor = (1 - subExplosion) * 20;
                sub.mesh.rotation.x += sub.rotationSpeed + (spinFactor * 0.02);
                sub.mesh.rotation.y += sub.rotationSpeed + (spinFactor * 0.02);
            } else {
                sub.currentOpacity = 0;
                sub.mesh.scale.setScalar(0.01);
            }
            
            sub.mesh.position.lerp(currentTarget, LERP_MED);
            sub.mesh.material.opacity = sub.currentOpacity;
            
            if (shouldShow && subExplosion > 0.5) {
                const sPos = worldToScreen(sub.mesh.position);
                sub.label.style.left = sPos.x + 'px';
                sub.label.style.top = sPos.y + 'px';
                sub.label.style.opacity = sub.currentOpacity;
                sub.label.style.pointerEvents = 'auto';
                sub.label.classList.toggle('active', itemIdx === hoveredItem);
            } else {
                sub.label.style.opacity = '0'; 
                sub.label.style.pointerEvents = 'none';
            }
        });
    });
    
    const partPos = pGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        partPos[i*3] += pVelocities[i].x; 
        partPos[i*3+1] += pVelocities[i].y; 
        partPos[i*3+2] += pVelocities[i].z;
        const bound = isMobile ? 50 : 80;
        if (Math.abs(partPos[i*3]) > bound) partPos[i*3] *= -0.9;
        if (Math.abs(partPos[i*3+1]) > bound) partPos[i*3+1] *= -0.9;
        if (Math.abs(partPos[i*3+2]) > bound) partPos[i*3+2] *= -0.9;
    }
    pGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    location.reload(); 
});

setInterval(() => {
    const el = document.getElementById('real-time-clock');
    if(el) el.textContent = new Intl.DateTimeFormat('hu-HU', {
        timeZone:'Europe/Budapest', 
        hour:'2-digit', 
        minute:'2-digit', 
        second:'2-digit'
    }).format(new Date());
}, 1000);

window.showUserUI = (u,a) => document.getElementById('auth-section').innerHTML = 
    `<span class="header-auth">${u.displayName||u.email.split('@')[0]} ${a?'[A]':''}</span><button class="btn-header" onclick="logoutUser()">KILÉPÉS</button>`;
window.showGuestUI = () => document.getElementById('auth-section').innerHTML = 
    `<a href="login.html"><button class="btn-header">BELÉPÉS</button></a>`;