# Cosmic Census (static)

An interactive tour of how many stars, galaxies, possible worlds and living things there are.
Plain HTML, CSS and JavaScript: no build step, no server code, ready for GitHub Pages.

## Publish on GitHub Pages

1. Create a new repository on GitHub, for example `cosmic-census`.
2. Upload everything in this folder to the repository root, including the hidden `.nojekyll` file:
   ```bash
   cd ~/Documents/cosmic-census-static
   git init && git add -A && git commit -m "Cosmic Census"
   git branch -M main
   git remote add origin https://github.com/<your-username>/cosmic-census.git
   git push -u origin main
   ```
3. In the repository, open **Settings › Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
4. After a minute or two the site is live at `https://<your-username>.github.io/cosmic-census/`.

## Preview locally

Browsers block loading `data/facts.json` from a file opened directly, so serve the folder:

```bash
cd ~/Documents/cosmic-census-static
python3 -m http.server 8000    # then open http://localhost:8000
```

## Files

```
index.html        Page structure
styles.css        Styles
app.js            Starfield, living cursor, galaxy, charts, calculator
data/facts.json   All figures shown on the site (edit here to change content)
favicon.svg
.nojekyll         Tells GitHub Pages to serve files as-is
```

## Notes

- All paths are relative, so the site works at a repository subpath like `/cosmic-census/`.
- A Content-Security-Policy meta tag allows only this site's own scripts plus Google Fonts.
  GitHub Pages can't send custom HTTP headers, so protections that need them (such as `frame-ancestors`) aren't available.
- The habitable-worlds calculator now runs in the browser, with the same input checks the API version had.

Figures are published estimates with wide uncertainty; sources are listed in the page footer.
