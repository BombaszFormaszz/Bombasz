import os
import io
import re
import zipfile
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from tkinterdnd2 import DND_FILES, TkinterDnD
from PIL import Image
Image.MAX_IMAGE_PIXELS = None 

def natural_sort_key(s):
    """Természetes sorbarendezés segéd."""
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split('([0-9]+)', s)]

class ComicConverterApp(TkinterDnD.Tk):
    def __init__(self):
        super().__init__()

        self.title("Képregény Long Strip Konvertáló (Javított)")
        self.geometry("600x500")
        
        self.files_to_process = []
        lbl_title = tk.Label(self, text="Húzd ide a CBZ/ZIP fájlokat!", font=("Arial", 14, "bold"))
        lbl_title.pack(pady=10)

        frame_list = tk.Frame(self)
        frame_list.pack(fill=tk.BOTH, expand=True, padx=10)

        scrollbar = tk.Scrollbar(frame_list)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.listbox = tk.Listbox(frame_list, selectmode=tk.EXTENDED, yscrollcommand=scrollbar.set, font=("Consolas", 9))
        self.listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.listbox.yview)

        self.listbox.drop_target_register(DND_FILES)
        self.listbox.dnd_bind('<<Drop>>', self.drop_files)

        frame_buttons = tk.Frame(self)
        frame_buttons.pack(fill=tk.X, padx=10, pady=10)

        btn_add = tk.Button(frame_buttons, text="Fájlok hozzáadása...", command=self.browse_files)
        btn_add.pack(side=tk.LEFT, padx=5)

        btn_clear = tk.Button(frame_buttons, text="Lista törlése", command=self.clear_list)
        btn_clear.pack(side=tk.LEFT, padx=5)

        self.btn_start = tk.Button(frame_buttons, text="KONVERTÁLÁS INDÍTÁSA", bg="#4CAF50", fg="white", font=("Arial", 10, "bold"), command=self.start_processing_thread)
        self.btn_start.pack(side=tk.RIGHT, padx=5)

        self.progress = ttk.Progressbar(self, orient=tk.HORIZONTAL, length=100, mode='determinate')
        self.progress.pack(fill=tk.X, padx=10, pady=(0, 5))

        self.status_var = tk.StringVar()
        self.status_var.set("Várakozás fájlokra...")
        lbl_status = tk.Label(self, textvariable=self.status_var, bd=1, relief=tk.SUNKEN, anchor=tk.W)
        lbl_status.pack(side=tk.BOTTOM, fill=tk.X)

    def parse_dropped_files(self, event_data):
        if "{" in event_data:
            files = re.findall(r'\{(?P<path>.*?)\}|(?P<path2>[^{}\s]+)', event_data)
            cleaned_files = [f[0] or f[1] for f in files]
            return cleaned_files
        else:
            return event_data.split()

    def drop_files(self, event):
        file_paths = self.parse_dropped_files(event.data)
        self.add_files_to_list(file_paths)

    def browse_files(self):
        file_paths = filedialog.askopenfilenames(
            title="Válassz képregény fájlokat",
            filetypes=[("Comic Book / Zip", "*.cbz *.zip *.rar"), ("Minden fájl", "*.*")]
        )
        self.add_files_to_list(file_paths)

    def add_files_to_list(self, file_paths):
        for path in file_paths:
            path = path.strip()
            if path not in self.files_to_process and os.path.isfile(path):
                ext = os.path.splitext(path)[1].lower()
                if ext in ['.zip', '.cbz']:
                    self.files_to_process.append(path)
                    self.listbox.insert(tk.END, path)
        self.status_var.set(f"{len(self.files_to_process)} fájl a listában.")

    def clear_list(self):
        self.files_to_process = []
        self.listbox.delete(0, tk.END)
        self.status_var.set("Lista törölve.")
        self.progress['value'] = 0

    def start_processing_thread(self):
        if not self.files_to_process:
            messagebox.showwarning("Figyelem", "Nincs fájl a listában!")
            return
        self.btn_start.config(state=tk.DISABLED)
        thread = threading.Thread(target=self.process_files)
        thread.start()

    def process_files(self):
        self.files_to_process.sort()
        total_files = len(self.files_to_process)
        self.progress['maximum'] = total_files
        errors = []

        for index, file_path in enumerate(self.files_to_process):
            filename = os.path.basename(file_path)
            self.status_var.set(f"Feldolgozás ({index+1}/{total_files}): {filename}...")
            self.update_idletasks()

            try:
                self.convert_archive(file_path)
            except Exception as e:
                print(f"Hiba: {e}")
                errors.append(f"{filename}: {str(e)}")

            self.progress['value'] = index + 1

        self.status_var.set("Kész!")
        self.btn_start.config(state=tk.NORMAL)
        
        final_msg = "Minden fájl feldolgozva!"
        if errors:
            final_msg += "\n\nHibák történtek:\n" + "\n".join(errors)
            messagebox.showerror("Kész (hibákkal)", final_msg)
        else:
            messagebox.showinfo("Kész", final_msg)

    def convert_archive(self, archive_path):
        """
        ZIP/CBZ konvertálása. 
        Ha a magasság > 65000 pixel, automatikusan PNG-re vált.
        """
        images = []
        try:
            with zipfile.ZipFile(archive_path, 'r') as archive:
                file_list = [f for f in archive.namelist() 
                             if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
                file_list.sort(key=natural_sort_key)
                
                if not file_list:
                    raise Exception("Nem találtam képeket.")

                for file_name in file_list:
                    try:
                        file_data = archive.read(file_name)
                        img = Image.open(io.BytesIO(file_data))
                        images.append(img.convert('RGB'))
                    except:
                        pass
        except zipfile.BadZipFile:
            raise Exception("Sérült ZIP/CBZ fájl.")

        if not images:
            raise Exception("Üres vagy hibás archívum.")

        max_width = max(img.width for img in images)
        total_height = sum(img.height for img in images)

        print(f"Kép mérete: {max_width}x{total_height}")

        base_name = os.path.splitext(archive_path)[0]
        
        if total_height > 65000:
            print("FIGYELEM: A kép túl magas JPG-hez (>65k pixel). Váltás PNG-re.")
            output_path = f"{base_name}_long.png"
            save_format = "PNG"
        else:
            output_path = f"{base_name}_long.jpg"
            save_format = "JPEG"

        long_image = Image.new('RGB', (max_width, total_height), (255, 255, 255))

        current_y = 0
        for img in images:
            x_offset = (max_width - img.width) // 2
            long_image.paste(img, (x_offset, current_y))
            current_y += img.height
            img.close()
        if save_format == "PNG":
            long_image.save(output_path, format="PNG", compress_level=1)
        else:
            long_image.save(output_path, format="JPEG", quality=85, optimize=True)

if __name__ == "__main__":
    app = ComicConverterApp()
    app.mainloop()