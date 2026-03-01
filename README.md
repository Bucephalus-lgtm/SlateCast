<h1 align="center">
  <br>
  SlateCast 🎓🖊️
  <br>
</h1>

<h4 align="center">A high-performance virtual canvas tailored for educators to teach, draw, and screen-record.</h4>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-to-use">How To Use</a> •
  <a href="#security">Security</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

![Screenshot](public/vite.svg)
<!-- You can later replace the vite.svg with an actual screenshot of your app by taking a snapshot and putting it in /public/screenshot.png -->

## 🌟 The Need for SlateCast

When teaching math or other complex subjects remotely, educators often have PDFs of test papers or Multiple Choice Questions (MCQs). The standard flow involves opening the document and desperately searching for an easy way to draw on it using pen-tablets or the mouse, all while trying to screen-record their session via OBS or similar software. 

**SlateCast** solves this entirely. It's a frictionless, browser-based whiteboard where you upload your teaching materials over a dark, focus-centric UI. You immediately get access to high-performance writing tools, shapes, multi-color support, and a dedicated object-eraser—perfectly complementing your screen recording software.

## ✨ Features

*   **Document Uploading:** Flawless rendering for **PDF** multipage documents and sanitized **HTML** files without loss of native fidelity.
*   **Virtual Pen Suite:**
    *   **Freehand Drawing:** Smooth mapping for mouse, trackpad, and graphic tablets with variable stroke thickness.
    *   **Precision Eraser:** Click on any previously drawn stroke or shape to instantly delete the entire object without rubbing out the underlying PDF text.
    *   **Instant Shapes & Text:** Quickly draw perfect rectangles, circles, or drop typed text onto the screen.
*   **Color Palette:** A vibrant 11-color palette designed to pop against standard white documents, enabling complex color-coded teaching.
*   **Persistent Paging:** For multi-page PDFs, your drawings on Page 1 remain intact if you navigate to Page 2 and then back again. Drawings auto-save strictly to your current session.
*   **Dark Premium Aesthetic:** Built using modern Glassmorphism and tailored dark modes to give your recorded videos a professional "studio" border.

## 🛡️ Security First Architecture

Client-side safety is paramount since teachers handle hundreds of untrusted files. 
- **Isolated Execution:** No backend server processing. All document parsing happens securely within your browser sandbox.
- **Deep Sanitization:** HTML uploads are fiercely stripped of malicious `<script>` tags, event listeners, and harmful objects using DOMPurify before being rendered onto the canvas.
- **Strict File Type Enforcement.**

## 🚀 How To Use

To clone and run this application, you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with npm) installed on your computer.

```bash
# Clone this repository
$ git clone https://github.com/Bucephalus-lgtm/SlateCast.git

# Go into the repository
$ cd SlateCast

# Install dependencies
$ npm install

# Run the app locally
$ npm run dev
```
Open your browser to `http://localhost:5173/` and upload your first PDF! 

## 🛠️ Tech Stack

This project was carefully configured with modern web standards:
- **React 18** + **Vite** + **TypeScript** for extreme front-end speed.
- **PDF.js** (by Mozilla) to natively render PDFs onto an HTML canvas.
- **Fabric.js** to handle intricate vector graphics, layers, and custom brush logic.
- **Lucide React** for crisp UI iconography.
- **Vanilla CSS** employing modern CSS Variables, dynamic hover states, and structural aesthetics. 

---
> 💡 *Why no Doc/Docx support?* Web browsers lack native rendering engines for Microsoft Word formats without heavy formatting loss (which breaks math equations). Converting doc/docx seamlessly into browser-viewable format requires a backend running LibreOffice/Pandoc. This project intentionally stays 100% Client-Side for speed and low cost—just export your docs to PDF and import!
