let ufos = [];
let score = 0;
let level = 1;
let speed = 3;
function removeUFO(ufo) {
    if (ufo.parentNode) ufo.remove();
    ufos = ufos.filter(x => x !== ufo);
}
function updateScore() {
    let pontok = document.getElementById("pontokdih");
    pontok.innerHTML = `Pontok: ${score}`;
    
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("h1").textContent = "Level 1";
    updateScore();
    updateBackground();
    setInterval(spawnUFO, 800);
    setInterval(moveAll, 10);
});
function updateBackground() {
    if (level === 1) {
        document.body.style.backgroundImage = "url('src/hatter1.jpg')";
    }
    else if (level === 2) {
        document.body.style.backgroundImage = "url('src/hatter2.jpg')";
    }
    else if (level === 3) {
        document.body.style.backgroundImage = "url('src/hatter3.jpg')";
    }
    else if (level === 4) {
        document.body.style.backgroundImage = "url('src/hatter4.jpg')";
    }
    else if (level === 5) {
        document.body.style.backgroundImage = "url('src/hatter5.jpg')";
    }
    else if (level === 6) {
        document.body.style.backgroundImage = "url('src/hatter6.jpg')";
    }
    else if (level === 7) {
        document.body.style.backgroundImage = "url('src/hatter7.jpg')";
    }
    else if (level === 8) {
        document.body.style.backgroundImage = "url('src/hatter8.png')";
    }
    else if (level === 9) {
        document.body.style.backgroundImage = "url('src/hatter9.jpg')";
    }
    else if (level === 10) {
        document.body.style.backgroundImage = "url('src/hatter10.jpg')";
    }

}
function updateLevel() {
    let newLevel = 1;
    if (newLevel > 10) newLevel = 10;

    if (score >= 90) {
        newLevel = 10;
    }
    else if (score >= 80) {
        newLevel = 9;
    }
    else if (score >= 70) {
        newLevel = 8;
    }
    else if (score >= 60) {
        newLevel = 7;
    }
    else if (score >= 50) {
        newLevel = 6;
    }
    else if (score >= 40) {
        newLevel = 5;
    }
    else if (score >= 30) {
        newLevel = 4;
    }
    else if (score >= 20) {
        newLevel = 3;
    } else if (score >= 10) {
        newLevel = 2;
    }

    if (newLevel !== level) {
        level = newLevel;
        document.querySelector("h1").textContent = `Level ${level}`;
        speed = 3 + (level - 1) * 2;
        updateBackground();
    }
}
function spawnUFO() {
    let ufo = document.createElement("img");
    ufo.src = "src/ufo.gif";
    ufo.style.position = "absolute";
    ufo.style.top = (window.innerHeight - 200) * Math.random() + "px";
    ufo.style.left = "-200px";
    ufo.style.width = "200px";
    //ufo.style.cursor = "crosshair";
    ufo.style.zIndex = "10";
    document.body.appendChild(ufo);
    ufos.push(ufo);
    ufo.addEventListener("click", boom);
}
function boom(event) {
    let ufo = event.target;
    score++;
    updateScore();
    updateLevel();
    let bumm = document.createElement("img");
    bumm.src = "src/bumm.gif?" + Math.random();
    bumm.style.position = "absolute";
    bumm.style.left = event.clientX - 100 + "px";
    bumm.style.top = event.clientY - 100 + "px";
    bumm.style.width = "200px";
    bumm.style.pointerEvents = "none";
    bumm.style.zIndex = "20";
    document.body.appendChild(bumm);
    new Audio("src/explosion.mp3").play().catch(() => { });
    removeUFO(ufo);
    setTimeout(() => bumm.remove(), 700);
}
function moveAll() {
    for (let i = ufos.length - 1; i >= 0; i--) {
        let ufo = ufos[i];
        let left = parseFloat(ufo.style.left);
        ufo.style.left = left + speed + "px";

        if (left > window.innerWidth) {
            removeUFO(ufo);
            score = Math.max(0, score - 1);
            updateScore();
            updateLevel();
        }
    }
}
