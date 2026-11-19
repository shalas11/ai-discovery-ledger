# AI Discovery Ledger

News of scientific and technical discoveries made by AI systems, logged daily with sources and what is still unverified.

The site is plain static files built from one data file. There are no dependencies beyond Node 20 or newer.

## Updating the ledger

Everything on the site comes from `data/entries.json`. Edit that file and push to `main`; the workflow in `.github/workflows/pages.yml` rebuilds and publishes the site. If the file has a mistake (a missing field, a duplicate id, a bad date) the build fails and the live site stays as it was.

```json
{
  "checked": "2026-11-18",
  "entries": [
    {
      "id": "2026-11-06-aaronson-ambainis",
      "date": "2026-11-06",
      "logged": "2026-11-17",
      "field": "Computer science",
      "title": "…",
      "who": "…",
      "system": "…",
      "sum": "…",
      "open": "…",
      "src": [{ "label": "PSI", "url": "https://…" }]
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `checked` | The date the ledger was last checked against the news. |
| `id` | Permanent. It is the entry's address (`/entry/<id>/`), so never change it once published. Lowercase letters, digits and hyphens. |
| `date` | When the result was announced or published. |
| `logged` | When the entry was added here. Optional; used for the feed order. |
| `open` | What is still unverified or limited. May be an empty string. Rewritten when follow-up news arrives. |
| `src` | At least one source with a label and a link. |

New entries go at the top of the list.

## Building locally

```bash
node build.mjs
```

writes the site to `dist/`. To preview it:

```bash
node tools/serve.mjs
```

## Settings

`site.config.json` holds the fallback site address (the deploy uses the GitHub Pages address, now https://aidiscoveryledger.com) and the Buttondown username. While `buttondownUsername` is empty the sign-up box shows a "first issue is on its way" line in place of the form.

The image used for link previews is `static/og.png`, rendered from `tools/og-card.html` by `tools/render-og.sh`.
