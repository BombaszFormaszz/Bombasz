import tkinter as tk
from tkinter import filedialog, messagebox
import re
from datetime import timedelta

# --- SRT feldolgozó logika ---

def ido_eltolas(ido_str, eltolas_sec):
    """
    Egy HH:MM:SS,mmm formátumú időbélyeget tol el a megadott másodperccel.
    """
    try:
        # Idő komponensek kinyerése
        ora, perc, maradek = ido_str.split(':')
        masodperc, millisec = maradek.split(',')

        # Összes idő másodpercben (float)
        teljes_masodperc = (int(ora) * 3600 +
                            int(perc) * 60 +
                            int(masodperc) +
                            int(millisec) / 1000)

        # Eltolás alkalmazása
        uj_teljes_masodperc = teljes_masodperc + eltolas_sec

        # Negatív idő elkerülése (ha hátra tolunk és túl korán van az idő)
        if uj_teljes_masodperc < 0:
            uj_teljes_masodperc = 0.0

        # Visszaalakítás HH:MM:SS,mmm formátumra
        td = timedelta(seconds=uj_teljes_masodperc)
        
        # A timedelta egész másodperc és mikromásodperc részei
        masodpercek = int(td.total_seconds())
        mikromasodpercek = td.microseconds

        # Óra, perc, másodperc, milliszekundum kinyerése
        uj_ora = masodpercek // 3600
        maradek_masodperc = masodpercek % 3600
        uj_perc = maradek_masodperc // 60
        uj_masodperc = maradek_masodperc % 60
        uj_millisec = mikromasodpercek // 1000

        # Formázás (HH:MM:SS,mmm)
        return f"{uj_ora:02d}:{uj_perc:02d}:{uj_masodperc:02d},{uj_millisec:03d}"

    except Exception:
        # Hiba esetén hagyjuk érintetlenül az időbélyeget
        return ido_str

def srt_eltolas(bevitel, eltolas_sec):
    """
    Felolvassa az SRT fájlt, eltolja az időbélyegeket, és létrehozza az új fájlt.
    """
    ido_minta = re.compile(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})')
    tartalom = None
    
    # 1. Próbálkozás UTF-8 kódolással (modern, ajánlott)
    try:
        with open(bevitel, 'r', encoding='utf-8') as f:
            tartalom = f.read()
            
    except UnicodeDecodeError:
        # 2. Próbálkozás Windows-1250 kódolással (régi magyar/kelet-európai)
        try:
            with open(bevitel, 'r', encoding='windows-1250') as f:
                tartalom = f.read()
                
        except Exception:
            # Ha sem az UTF-8, sem a Windows-1250 nem működik
            return "HIBA: A bemeneti fájl olvasásakor: A fájl kódolása ismeretlen, nem lehet ékezetesen beolvasni."
            
    except FileNotFoundError:
        return f"HIBA: A bemeneti fájl nem található: {bevitel}"
    except Exception as e:
        return f"HIBA a bemeneti fájl olvasásakor: {e}"

    def csere_fuggveny(match):
        """A reguláris kifejezéshez használt csere-függvény."""
        kezdeti_ido = match.group(1)
        veg_ido = match.group(2)
        
        uj_kezdeti = ido_eltolas(kezdeti_ido, eltolas_sec)
        uj_veg = ido_eltolas(veg_ido, eltolas_sec)
        
        return f"{uj_kezdeti} --> {uj_veg}"

    # Cserélje ki az összes idősort az eltolt idősorokra
    uj_tartalom = ido_minta.sub(csere_fuggveny, tartalom)

    try:
        # A kimeneti fájl neve: eredeti_név_shifted.srt
        kimenet = bevitel.replace('.srt', '_shifted.srt') if bevitel.endswith('.srt') else bevitel + '_shifted.srt'
        
        # Fájl kiírása UTF-8 kódolással (a kimenet mindig UTF-8 lesz)
        with open(kimenet, 'w', encoding='utf-8') as f:
            f.write(uj_tartalom)
        
        return f"Sikeresen elkészült a felirat fájl:\n{kimenet}\n(Eltolás: {eltolas_sec:.3f} mp)"

    except Exception as e:
        return f"HIBA a kimeneti fájl írásakor: {e}"


# --- GUI (Tkinter) Logika ---

class SubtitleShifterApp:
    def __init__(self, master):
        self.master = master
        master.title("SRT Felirat Időzítő")
        master.resizable(False, False)

        self.input_file = tk.StringVar()
        self.shift_seconds = tk.StringVar(value="0.0") # Alapértelmezett 0.0

        # Fájl kiválasztása
        tk.Label(master, text="1. Feliratfájl (SRT) kiválasztása:", font=('Arial', 10, 'bold')).grid(row=0, column=0, padx=10, pady=(10, 0), sticky='w')
        tk.Entry(master, textvariable=self.input_file, width=50).grid(row=1, column=0, padx=10, pady=(0, 10))
        tk.Button(master, text="Tallózás...", command=self.browse_file).grid(row=1, column=1, padx=10, pady=(0, 10))

        # Eltolás mértéke
        tk.Label(master, text="2. Eltolás mértéke (másodpercben):", font=('Arial', 10, 'bold')).grid(row=2, column=0, padx=10, pady=(10, 0), sticky='w')
        tk.Label(master, text="Pozitív szám = Előre tolás (késleltetés)\nNegatív szám = Hátra tolás (korábban megjelenés)", fg='gray').grid(row=3, column=0, padx=10, pady=(0, 5), sticky='w')
        
        tk.Entry(master, textvariable=self.shift_seconds, width=10).grid(row=4, column=0, padx=10, pady=5, sticky='w')

        # Gomb
        tk.Button(master, text="3. IDŐZÍTÉS ELINDÍTÁSA", command=self.start_shift, bg='green', fg='white', font=('Arial', 12, 'bold')).grid(row=5, column=0, columnspan=2, padx=10, pady=20)


    def browse_file(self):
        """Megnyitja a fájlválasztó ablakot."""
        filename = filedialog.askopenfilename(
            defaultextension=".srt",
            filetypes=[("SubRip feliratok", "*.srt"), ("Minden fájl", "*.*")],
            title="Válassza ki a módosítandó SRT feliratfájlt"
        )
        if filename:
            self.input_file.set(filename)

    def start_shift(self):
        """Ellenőrzi az adatokat és elindítja az eltolást."""
        file_path = self.input_file.get()
        shift_val_str = self.shift_seconds.get()

        if not file_path or not file_path.endswith('.srt'):
            messagebox.showerror("Hiba", "Kérjük, válasszon egy érvényes SRT fájlt.")
            return

        try:
            shift_val = float(shift_val_str)
        except ValueError:
            messagebox.showerror("Hiba", "Az eltolás mértéke érvénytelen szám (használjon pontot tizedes elválasztónak, pl. -1.5).")
            return

        # Futtatás
        eredmeny = srt_eltolas(file_path, shift_val)

        # Eredmény megjelenítése
        if eredmeny.startswith("HIBA"):
            messagebox.showerror("Hiba az időzítésben", eredmeny)
        else:
            messagebox.showinfo("Siker", eredmeny)


if __name__ == "__main__":
    root = tk.Tk()
    app = SubtitleShifterApp(root)
    root.mainloop()