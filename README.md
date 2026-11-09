# Deepvoice Defense Demo

Interactive `5 × 4` audio comparison for a proactive defense against voice-cloning attacks.

## Comparison columns

1. Original voice
2. Deepvoice generated from the original voice
3. Defense-applied original voice
4. Deepvoice generated from the defense-applied voice

Each row compares a different generation seed using the same source utterance. Audio paths are declared in `data/samples.json`.

## Local preview

Serve the repository root with any static HTTP server. For example:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## GitHub Pages

The included workflow deploys the repository root to GitHub Pages. In **Settings → Pages**, select **GitHub Actions** as the publishing source if it is not already enabled.
