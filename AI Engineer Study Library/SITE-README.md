# AI Engineer Study Library

This folder is a self-contained webpage for the notes in `AI Engineer notes`.

## Open it

1. Run `build-site.ps1` once if the notes change.
2. Open `index.html` in a browser.

The generated `study-data.js` embeds the Markdown content so the site works from a local file without a database or build tool. The original notes remain in their existing folders and are not modified.

## Optional local server

If you prefer browser history and URL routing to work through a local server:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000` from this folder.

## Included files

- `index.html` — application shell
- `styles.css` — responsive visual system
- `app.js` — search, navigation, Markdown rendering, favorites, recent notes, and routing
- `study-data.js` — generated snapshot of every Markdown note
- `build-site.ps1` — rebuilds `study-data.js` from the source notes
