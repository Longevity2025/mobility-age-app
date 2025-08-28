# 🧑‍🦽 Mobility Age App

The **Mobility Age App** is a self-contained, browser-based tool that calculates an individual’s **Mobility Index** and assigns a corresponding **Mobility Age** based on six physical fitness tests:

- Timed Up and Go (TUG)  
- VO₂max (aerobic capacity)  
- Mid-Thigh Pull (static strength)  
- Sit-and-Reach (flexibility)  
- Grip Strength  
- Postural Sway (balance)  

Normative data (age- and sex-specific means and SDs) are built into the app. Calculations are performed entirely offline in your browser — no internet connection or external servers required once the page is loaded.

---

## 🌐 Live App
👉 [Open the Mobility Age App](https://YOUR-USERNAME.github.io/mobility-age-app/)  

*(replace `YOUR-USERNAME` with your GitHub username — this will be the live link once Pages is enabled).*

---

## 📖 How to Use
1. Open the [live link](#-live-app) in any modern browser (Chrome, Edge, Firefox, Safari).
2. Enter **Name, Age, Sex**.
3. Input test results in the measurement fields.
4. Click **Calculate**.  
   - The app displays **Z-scores**, a **Weighted Composite Index**, and your calculated **Mobility Age**.
5. Use the **Print/Report** function to generate a print-friendly summary.

---

## 🔍 Features
- Runs **100% locally** (no external data or tracking).
- Built-in **normative datasets** (20–85 years).
- **Weighted scoring** (VO₂max ×1.50, TUG ×1.25, others ×1.0).
- Bilateral inputs for Grip Strength and Postural Sway (averaged internally).
- Debug hidden by default, but can be toggled for testing.
- **Print-friendly report** view.

---

## 🔧 Updating the App
To update the live version:
1. On GitHub, open this repo.
2. Click **Add file → Upload files**.
3. Upload the new version of `index.html` (replacing the old one).
4. Click **Commit changes**.  
   The live app updates in ~30 seconds.

---

## 🛠 Development Notes
- Entirely single-file (`index.html`).
- Tested in Chrome, Edge, Firefox, Safari (desktop).
- Best used in **full browser**, not inside Dropbox/Google Drive previews.
- Integrity check: startup includes a **self-test** to confirm norms load correctly.

---

## 📜 License
This project is intended for educational, testing, and research use.  
All rights reserved © [Your Name / Organization].

---
