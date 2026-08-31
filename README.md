# Calligraphy Guide Sheet Generator

A self-contained, client-side tool for building custom calligraphy practice sheets.

- **From scratch** — choose paper size, margins, x-height, ascender/descender height, line spacing, and optional slant guide lines (with presets for Broad-edge/Italic, Copperplate/Pointed Pen, and Simple ruled).
- **Upload photo** — use a photo (e.g. a handwriting sample) as a background layer to trace over, with adjustable opacity, scale, rotation, and drag-to-reposition, optionally with guide lines overlaid on top.
- **Download PDF** — renders a print-ready PDF at the chosen paper size, entirely in the browser. No files are uploaded to a server.

## Files

- `index.html` / `style.css` / `app.js` — the app.
- `vendor-jspdf.umd.min.js` — jsPDF, vendored locally so the tool has no external runtime dependencies (no CDN calls, works even with strict site CSPs).

   index.html
   the file the browser opens.
      Page Structure:
         Sidebar controls (paper size, sliders, checkboxes, buttons)
         canvas where the guide sheet is drawn.

   style.css
   visual styling
      colors, layout, spacing, fonts for the controls panel and preview area

   app.js
   The logic
      i.e. where to change behavior or add features.
      draws the guide lines/slant lines on the canvas,
      control handling
         paper size, x-height, presets, photo upload/drag/scale/rotate
      builds the PDF on download.

   vendor-jspdf.umd.min.js
   A third-party library (jsPDF)
   does the actual PDF-building.
   Bundled locally rather than loaded from the internet, so the tool doesn't break if a CDN is down.
   Shouldn't need to touch this one.

   README.md
   documentation on what the tool does and how to embed it.
   Provides so functionality

If you want to tweak colors/spaci

## Embedding on your website

## Commiting
Check
   git branch --show-current     show with branch I'm on
   git branch -a                 show all brances in repo
   git switch [branch to move to]switch to different branch
   git status
   git diff
Commiting
   git add .                     stages every changed file (everything you edited since the last push)
   git commit -m "..."           saves changes locally w message
   git push                      uploads commits to GitHub repo, triggering GitHub Pages to redeploy automatically

Copy these files to your site and either:

1. **iframe embed:**
   ```html
   <iframe src="/lettering-guidesheet/index.html" style="width:100%; height:900px; border:0;"></iframe>
   ```
2. **Direct include:** host the files at a path (e.g. `/tools/lettering-guidesheet/`) and link to it directly.

No build step, server, or API keys are required.


