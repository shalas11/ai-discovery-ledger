# AI Discovery Ledger

A running record of scientific and technical results where an AI system did the discovering. Every entry carries a grade for how well the claim has been checked.

The site is plain static files built from one data file. There are no dependencies beyond Node 20 or newer.

## Updating the ledger

Everything on the site comes from `data/entries.json`. Edit that file and push to `main`; the workflow in `.github/workflows/pages.yml` rebuilds and publishes the site. If the file has a mistake (a missing field, a duplicate id, an unknown grade) the build fails and the live site stays as it was.

```json
{
  "checked": "2026-11-18",
  "entries": [
    {
      "id": "2026-11-06-aaronson-ambainis",
      "date": "2026-11-06",
      "logged": "2026-11-17",
      "field": "Computer science",
      "grade": "machine",
      "title": "…",
      "who": "…",
      "system": "…",
      "sum": "…",
      "open": "…",
      "src": [{ "label": "PSI", "url": "https://…" }],
      "history": [{ "date": "2026-11-17", "from": "announced", "to": "machine", "note": "…" }]
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
| `grade` | `announced`, `machine`, `peer`, `confirmed` or `contested`. |
| `open` | What is still unresolved. May be an empty string. |
| `src` | At least one source with a label and a link. |
| `history` | Optional. Add one item each time the grade changes; the entry page and the RSS feed both show it. |

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

`site.config.json` holds the site address and the Buttondown username. While `buttondownUsername` is empty the sign-up box shows a "first issue is on its way" line in place of the form.

The image used for link previews is `static/og.png`, rendered from `tools/og-card.html` by `tools/render-og.sh`.
