// Alap termékadatok (csak első indításkor)
const alapTermekek = {
    alma:   { nev: "Alma",   ar: 500, db: 0 },
    korte:  { nev: "Körte",  ar: 600, db: 0 },
    banan:  { nev: "Banán",  ar: 700, db: 0 }
};

// Inicializálás – csak egyszer fut le, ha még nincs adat
Object.keys(alapTermekek).forEach(key => {
    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(alapTermekek[key]));
    }
});

// DOM elemek cache-elése (gyorsabb és olvashatóbb)
const pages = {
    main:     document.getElementById("main_page"),
    products: document.getElementById("products_page"),
    contacts: document.getElementById("contacts_page")
};

const kosarLista  = document.getElementById("kosar_lista");
const vegOsszeg   = document.getElementById("vegosszeg");

// Oldalváltás függvények
function showPage(pageName) {
    Object.values(pages).forEach(p => p.style.display = "none");
    pages[pageName].style.display = "block";
    
    if (pageName === "products") {
        betoltTermekNeveket();
        frissitKosarat();
    }
}

function nyit_main_page()     { showPage("main");     }
function nyit_products()      { showPage("products"); }
function nyit_contacts()      { showPage("contacts"); }

// Terméknév módosítása
function ment_nev(termekKey) {
    const adat = JSON.parse(localStorage.getItem(termekKey));
    const input = document.getElementById(`${termekKey}_nev_input`);
    
    const ujNev = input.value.trim();
    if (ujNev) {
        adat.nev = ujNev;
        localStorage.setItem(termekKey, JSON.stringify(adat));
        frissitKosarat();
    }
}

// Kosárba tétel (kumulatív)
function kosarba(termekKey) {
    const adat = JSON.parse(localStorage.getItem(termekKey));
    const mennyisegInput = document.getElementById(`${termekKey}_db`);
    const mennyiseg = Number(mennyisegInput.value) || 0;

    if (mennyiseg > 0) {
        adat.db += mennyiseg;
        localStorage.setItem(termekKey, JSON.stringify(adat));
        frissitKosarat();
        
        // Opcionális: vizuális visszajelzés (nem alert!)
        mennyisegInput.style.backgroundColor = "#d4edda";
        setTimeout(() => {
            mennyisegInput.style.backgroundColor = "";
        }, 800);
    }
}

// Terméknevek betöltése az input mezőkbe
function betoltTermekNeveket() {
    ["alma", "korte", "banan"].forEach(key => {
        const adat = JSON.parse(localStorage.getItem(key));
        document.getElementById(`${key}_nev_input`).value = adat.nev;
    });
}

// Kosár frissítése + végösszeg számítás
function frissitKosarat() {
    kosarLista.innerHTML = "";
    let osszeg = 0;

    ["alma", "korte", "banan"].forEach(key => {
        const item = JSON.parse(localStorage.getItem(key));
        
        if (item.db > 0) {
            const sorOsszeg = item.db * item.ar;
            osszeg += sorOsszeg;

            const li = document.createElement("li");
            li.innerHTML = `
                ${item.nev}: ${item.db} kg – ${sorOsszeg.toLocaleString()} Ft
                <button class = "torles" onclick="torol('${key}')">Törlés</button>
            `;
            kosarLista.appendChild(li);
        }
    });

    // Ha üres a kosár
    if (kosarLista.children.length === 0) {
        kosarLista.innerHTML = '<li class="empty">A kosár jelenleg üres...</li>';
    }

    vegOsszeg.textContent = `Végösszeg: ${osszeg.toLocaleString()} Ft`;
}

// Egy termék teljes törlése a kosárból (db = 0)
function torol(termekKey) {
    const adat = JSON.parse(localStorage.getItem(termekKey));
    adat.db = 0;
    localStorage.setItem(termekKey, JSON.stringify(adat));
    frissitKosarat();
}

// =============================================
// Indításkor futó inicializálás
// =============================================
document.addEventListener("DOMContentLoaded", () => {
    // Alapértelmezett oldal
    showPage("main");
    
    // Kosár betöltése (ha újratöltöttük az oldalt)
    frissitKosarat();
});