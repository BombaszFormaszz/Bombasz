document.addEventListener("DOMContentLoaded", () => {
    // Slideshow alapból elrejtve
    const slideshowSection = document.querySelector('.slideshow-wrapper');
    slideshowSection.style.display = 'none';
    slideshowSection.style.opacity = '0';
    slideshowSection.style.transform = 'translateY(20px)';
    slideshowSection.style.transition = 'all 0.6s ease';

    // Slideshow toggle gomb
    const toggleBtn = document.getElementById('toggle-slideshow');
    toggleBtn.addEventListener('click', () => {
        if (slideshowSection.style.display === 'none' || slideshowSection.style.opacity === '0') {
            slideshowSection.style.display = 'block';
            setTimeout(() => {
                slideshowSection.style.opacity = '1';
                slideshowSection.style.transform = 'translateY(0)';
            }, 10);
        } else {
            slideshowSection.style.opacity = '0';
            slideshowSection.style.transform = 'translateY(20px)';
            setTimeout(() => {
                slideshowSection.style.display = 'none';
            }, 600);
        }
    });

    // Slideshow működés
    const slides = document.querySelectorAll('.slide');
    const prev = document.querySelector('.prev');
    const next = document.querySelector('.next');
    const dotsContainer = document.querySelector('.dots');
    let slideIndex = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        dot.addEventListener('click', () => showSlide(i));
        dotsContainer.appendChild(dot);
    });
    const dots = document.querySelectorAll('.dot');
    if (dots[0]) dots[0].classList.add('active');

    function showSlide(n) {
        slideIndex = (n + slides.length) % slides.length;
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[slideIndex].classList.add('active');
        dots[slideIndex].classList.add('active');
    }

    if (prev) prev.addEventListener('click', () => showSlide(slideIndex - 1));
    if (next) next.addEventListener('click', () => showSlide(slideIndex + 1));

    setInterval(() => showSlide(slideIndex + 1), 5000);
});

// Hamburger toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => { navMenu.classList.toggle('show'); });
}

// Member card toggle
document.querySelectorAll('.member-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const arrow = toggle.querySelector('.member-arrow');
        const extra = toggle.nextElementSibling;
        extra.classList.toggle('show');
        arrow.classList.toggle('open');
    });
});

// -------------------- Fejlesztői eszközök tiltása --------------------
var isCtrl = false;
document.onkeyup = function(e){ if(e.which==17) isCtrl=false; }
document.onkeydown = function(e){
    if(e.which==17) isCtrl=true;
    if(((e.which==85)||(e.which==65)||(e.which==88)||(e.which==67)||(e.which==86)||(e.which==123)||(e.which==83)) && isCtrl){
        alert('nuh-uh'); return false;
    }
}
document.addEventListener('contextmenu', e => e.preventDefault());
function ctrlShiftKey(e,keyCode){return e.ctrlKey && e.shiftKey && e.keyCode===keyCode.charCodeAt(0);}
document.onkeydown = (e)=>{
    if(e.keyCode===123 || ctrlShiftKey(e,'I') || ctrlShiftKey(e,'J') || ctrlShiftKey(e,'C') || (e.ctrlKey && e.keyCode==='U'.charCodeAt(0))){
        alert('nuh-uh'); return false;
    }
}
document.onselectstart=()=>false;
if(window.sidebar){document.onmousedown=()=>false;document.onclick=()=>true;}

// -------------------- Canvas Background --------------------
const canvas = document.getElementById('bg-circles');
const ctx = canvas.getContext('2d');
let width,height;
let layers=[];
let mouseX=window.innerWidth/2, mouseY=window.innerHeight/2, scrollY=0;

function Circle(layer){
    this.x = Math.random()*width;
    this.baseY = Math.random()*height;
    this.baseRadius = 10 + Math.random()*(layer===0?30:layer===1?40:60);
    this.radius = this.baseRadius;
    this.speedX = (Math.random()-0.5)*(layer===0?0.2:layer===1?0.4:0.7);
    this.speedY = (Math.random()-0.5)*(layer===0?0.2:layer===1?0.4:0.7);
    this.hue = 180 + Math.random()*60;
    this.layer = layer;
    this.parallaxX = 0;
    this.parallaxY = 0;
    this.pulseOffset = Math.random()*Math.PI*2;
    this.trail = [];
}

Circle.prototype.update=function(){
    this.x+=this.speedX;
    this.baseY+=this.speedY;
    if(this.x<-this.radius)this.x=width+this.radius;
    if(this.x>width+this.radius)this.x=-this.radius;
    if(this.baseY<-this.radius)this.baseY=height+this.radius;
    if(this.baseY>height)this.baseY=-this.radius;
    const parallaxFactor = this.layer===0?0.01:this.layer===1?0.02:0.04;
    this.parallaxX=(mouseX-width/2)*parallaxFactor;
    this.parallaxY=(mouseY-height/2)*parallaxFactor+scrollY*parallaxFactor*2;
    this.radius=this.baseRadius*(0.85+0.15*Math.sin(Date.now()*0.002+this.pulseOffset));
    this.hue=180+60*Math.sin(Date.now()*0.001+this.pulseOffset);
    this.trail.push({x:this.x+this.parallaxX, y:this.baseY+this.parallaxY, alpha:0.5, radius:this.radius, hue:this.hue});
    if(this.trail.length>25)this.trail.shift();
};

Circle.prototype.draw=function(){
    for(let i=0;i<this.trail.length;i++){
        const t=this.trail[i];
        ctx.beginPath();
        ctx.arc(t.x,t.y,t.radius*(i/this.trail.length*0.8+0.2),0,Math.PI*2);
        ctx.fillStyle=`hsla(${t.hue},80%,60%,${t.alpha*(i/this.trail.length)})`;
        ctx.fill();
    }
    ctx.beginPath();
    const color=`hsl(${this.hue},80%,60%)`;
    ctx.fillStyle=color;
    ctx.shadowColor=color;
    ctx.shadowBlur=30;
    ctx.arc(this.x+this.parallaxX,this.baseY+this.parallaxY,this.radius,0,Math.PI*2);
    ctx.fill();
};

window.addEventListener('mousemove', e=>{mouseX=e.clientX;mouseY=e.clientY;});
window.addEventListener('scroll', ()=>{scrollY=window.scrollY;});

function init(){
    width=window.innerWidth;
    height=window.innerHeight;
    canvas.width=width;
    canvas.height=height;
    layers=[[],[],[]];
    for(let l=0;l<3;l++){
        let count=l===0?10:l===1?15:20;
        for(let i=0;i<count;i++) layers[l].push(new Circle(l));
    }
}

function animate(){
    ctx.fillStyle='rgba(0,0,50,0.18)';
    ctx.fillRect(0,0,width,height);
    layers.forEach(layer=>layer.forEach(c=>{c.update();c.draw();}));
    requestAnimationFrame(animate);
}

window.addEventListener('resize',init);
init();
animate();

// -------------------- Óra --------------------
function updateClock(){
    const now=new Date();
    const h=String(now.getHours()).padStart(2,'0');
    const m=String(now.getMinutes()).padStart(2,'0');
    const s=String(now.getSeconds()).padStart(2,'0');
    const clockElement=document.getElementById('real-time-clock');
    if(clockElement){clockElement.textContent=`${h}:${m}:${s}`;}
}
setInterval(updateClock,1000);
updateClock();

// Scroll animáció
const observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting) entry.target.classList.add('show');});
},{threshold:0.15});
document.querySelectorAll("section, .member-card").forEach(el=>observer.observe(el));

// =========================================================
// 💬 NÉV-NEM ELEMZŐ PROGRAM V1.0 (A CHATBOT HELYETT)
// =========================================================

const chatBtn = document.getElementById('toggle-chat');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-chat');
const chatMessages = document.getElementById('chat-messages');

// alapból elrejtve
chatBox.style.display = 'none';
chatBox.style.opacity = '0';
chatBox.style.transform = 'translateY(20px)';
chatBox.style.transition = 'all 0.4s ease';

chatBtn.addEventListener('click', () => {
    // Változtassuk meg a gomb szövegét a kontextusnak megfelelően
    chatBtn.textContent = (chatBox.style.display === 'none' || chatBox.style.opacity === '0') ? 'Név Elemző Bezárása' : 'Chat';

    if (chatBox.style.display === 'none' || chatBox.style.opacity === '0') {
        chatBox.style.display = 'flex';
        setTimeout(() => { chatBox.style.opacity = '1'; chatBox.style.transform = 'translateY(0)'; }, 10);
    } else {
        chatBox.style.opacity = '0';
        chatBox.style.transform = 'translateY(20px)';
        setTimeout(() => { chatBox.style.display = 'none'; }, 400);
    }
});


// 🚺 Hungarian Name Classification Logic (Simplified) 🚹
// FIGYELEM: Ez egy erősen leegyszerűsített lista, kizárólag a demó céljából.
// =========================================================
// 💬 NÉV-NEM ELEMZŐ PROGRAM V1.2 (Sokkal, sokkal több névvel)
// =========================================================

// 🚺 Hungarian Name Classification Logic (Highly Extended) 🚹
const MALE_NAMES = [
    // A leggyakoribbak és népszerűek
    "bence", "levente", "máté", "dániel", "dominik", "noel", "dávid", 
    "zalán", "oliver", "benedek", "marcell", "ádám", "bálint", "zsolt", 
    "istván", "ferenc", "lászló", "gábor", "tamás", "kristóf", "norbert", 
    "zoltán", "jános", "tibor", "andrás", "imre", "sándor", "márk", 
    "szabolcs", "martin", "gergő", "attila", "péter", "ábel", "mihály", 
    "szilárd", "róbert", "györgy", "barnabás", "emil", "endre", "erik", 
    "fülöp", "gellért", "gyula", "henrik", "hubert", "kálmán", "kornél", 
    "lőrinc", "márton", "nándor", "pál", "richárd", "roland", "soma", 
    "viktor", "vilmos", "vendel", "zente", "zsombor", "milán", "krisztián", 
    "patrik", "denis", "balázs", "csaba", "denes", "titusz", "tódor", "rikárdó",
    "armandó", "hgery08", "ronáldó",
    
    // Történelmi és ritkább, de anyakönyvezhető
    "árpád", "hunor", "magor", "anatol", "antal", "benő", "bernárd", 
    "botond", "cameron", "cecil", "elemér", "enoch", "gáspár", "gelen", 
    "ignác", "illés", "jeromos", "joel", "józsef", "kázmér", "keán", 
    "lukács", "maximilián", "némó", "oszkár", "otis", "ottó", "reynold", 
    "rókus", "rudi", "russel", "szeverin", "tenger", "tihamér", "titán", 
    "veron", "virgil", "vladimir", "aladár", "béla", "jános", "kálmán", 
    "soma", "szilveszter", "szebasztián", "albert", "carlos", "eder", 
    "móric", "nicolas", "szervác", "valter", "vencel", "vince", "szemere",
    "bódog", "tuzson", "konstantin", "achilles"
];

const FEMALE_NAMES = [
    // A leggyakoribbak és népszerűek
    "hanna", "anna", "bogláka", "réka", "lilla", "luca", "fanni", 
    "nóra", "zoé", "kata", "zsuzsa", "eva", "edit", "katalin", 
    "viktória", "emese", "bea", "gréta", "kinga", "eszter", "vivien", 
    "panna", "ilona", "zita", "dorina", "krisztina", "enikő", "judit",
    "alexandra", "aliz", "anita", "babett", "betty", "borbála", "cézárina", 
    "cintia", "csenge", "dorottya", "edina", "elena", "elizabet", "flóra", 
    "franciska", "janka", "klaudia", "korina", "laura", "lívia", "matilda", 
    "melinda", "rézi", "szandra", "szofi", "szonja", "tímea", "vera", 
    "virág", "zsanett", "zille", "blanka", "adrienn", "alida", "mónika", 
    "evelin", "szabina", "bernadett", "gerda", "margit", "zsófia", "mercédesz",
    
    // Történelmi és ritkább, de anyakönyvezhető
    "adél", "agáta", "alda", "amelia", "anabella", "angelika", "aranka", 
    "auguszta", "bianka", "csilla", "dina", "elda", "elina", "felícia", 
    "gloria", "hajnalka", "héda", "iris", "kamilla", "karolina", "kitti", 
    "leila", "lenke", "liza", "lora", "margareta", "médea", "nadin", 
    "nia", "ornella", "piroska", "ramóna", "sarolta", "szabrina", 
    "szidónia", "szilvia", "színes", "titánia", "vanda", "vendelina", 
    "viktória", "vilma", "yvett", "zelma", "zille", "zora", "zilé",
    "auróra", "beatrix", "emma", "sára", "evelina", "dalma", "izabella",
    "kinga", "mira", "tünde", "céline"
];

function determineGender(name) {
    const lowerCaseName = name.toLowerCase().trim();

    if (lowerCaseName.length < 2) {
        return "Kérlek, adj meg egy érvényes nevet.";
    }

    // A .includes() az egyszerű összehasonlítás a gyorsaság érdekében
    if (MALE_NAMES.includes(lowerCaseName)) {
        return `A(z) **${name}** név valószínűleg **FÉRFI** név. ♂️`;
    }

    if (FEMALE_NAMES.includes(lowerCaseName)) {
        return `A(z) **${name}** név valószínűleg **NŐI** név. ♀️`;
    }

    return `Sajnos a(z) **${name}** nevet nem találom az alap listában. Nem megállapítható. 🤔`;
}
function determineGender(name) {
    const lowerCaseName = name.toLowerCase().trim();

    if (lowerCaseName.length < 2) {
        return "Kérlek, adj meg egy érvényes nevet.";
    }

    if (MALE_NAMES.includes(lowerCaseName)) {
        return `A(z) **${name}** név valószínűleg **FÉRFI** név. ♂️`;
    }

    if (FEMALE_NAMES.includes(lowerCaseName)) {
        return `A(z) **${name}** név valószínűleg **NŐI** név. ♀️`;
    }

    return `Sajnos a(z) **${name}** nevet nem találom az alap listában. Nem megállapítható. 🤔`;
}

function appendMessage(message, className) {
    const msgElement = document.createElement('div');
    msgElement.className = className;
    
    // Markdown-szerű boldolás implementálása
    msgElement.innerHTML = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    chatMessages.appendChild(msgElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function processName() {
    const name = chatInput.value.trim();
    if (!name) return;

    // Felhasználó üzenete
    appendMessage(name, 'user-msg');
    chatInput.value = '';

    // Bot válasza - szimulálunk egy kis késleltetést a valós hatásért
    appendMessage('Elemzés folyamatban...', 'bot-msg');

    setTimeout(() => {
        const result = determineGender(name);
        
        // Töröljük a '...'
        if (chatMessages.lastElementChild && chatMessages.lastElementChild.textContent === 'Elemzés folyamatban...') {
            chatMessages.removeChild(chatMessages.lastElementChild);
        }
        
        // Hozzáadjuk a valós választ
        appendMessage(result, 'bot-msg');
    }, 500);
}

sendBtn.addEventListener('click', processName);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();

});

