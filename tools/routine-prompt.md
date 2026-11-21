Twice-daily update of the AI Discovery Ledger (https://github.com/shalas11/ai-discovery-ledger, live at https://aidiscoveryledger.com/). The ledger is a news site: it publishes scientific and technical discoveries made by AI systems. You are running unattended in a fresh checkout of that repository: don't ask questions, and finish the whole job.

You change data/entries.json, and you may add picture files under static/images/. Nothing else. README.md in the repo describes its format; read it first. Every page, the RSS feed and the sitemap are generated from that file by `node build.mjs`, and a push to main publishes the site within a minute through GitHub Actions.

1. Read data/entries.json. Note `checked` and every existing entry (id, title, date, open).

2. Search the web for AI-made discoveries announced in the last 14 days (not only since `checked`: earlier runs once missed a result for 11 days). Run several searches: mathematics and proofs, computer science, algorithms and cryptography, biology, protein and genome design, medicine and drug candidates, physics, chemistry and materials. Also check deepmind.google/blog, openai.com/news, anthropic.com/news, research.google/blog, ScienceDaily's AI news, phys.org, Quanta Magazine, and arXiv coverage. Fetch the primary source for each candidate before logging it. If a source can't be fetched, say so in your summary rather than guessing what it says.

3. Inclusion bar: an AI system produced the central finding (a proof, a design that worked in the lab, a new algorithm, a pattern in data people had missed). Leave out model releases, funding, benchmark scores, product launches, opinion pieces, and work where AI only sped up routine tasks. Skip anything already in the ledger, including the same result under a different headline. Be selective: usually 0 to 3 new entries per run, and zero is fine.

4. Follow-ups: if there is real news about an existing entry (a peer-reviewed publication, an independent check, a retraction, a published objection, a fix), rewrite that entry's `open` text to match and add the new source to its `src`. If the follow-up is big news on its own, log it as a new entry as well. Never change an existing entry's `id`.

5. New entries go at the top of the `entries` list, newest first, in this exact shape:
   { "id": "YYYY-MM-DD-short-slug", "date": "YYYY-MM-DD", "logged": "<today>", "field": "...", "title": "...", "who": "...", "system": "...", "sum": "...", "open": "...", "src": [{ "label": "...", "url": "https://..." }] }
   - `date` is the announcement or publication date. `logged` is today's date in America/New_York.
   - `id` is permanent (it is the entry's web address): lowercase letters, digits and hyphens, starting with `date`.
   - `field`: reuse an existing one (Mathematics, Computer science, Biology, Medicine, Physics) or a new plain one such as Chemistry, Materials, Astronomy, Engineering.
   - `title` is a plain news headline. `sum` is 2 to 3 sentences with concrete numbers in plain words. `open` says what is still unverified or limited (for example "The company is the only source" or "Not yet peer reviewed"), or "" if nothing.
   - Write everything in your own words. Never copy sentences from a source. Only state facts you read in a source you fetched, and only use URLs you fetched.

6. Pictures and charts. Most entries get neither; add one only when it clearly fits, and only for entries you add or update in this run.
   - A picture must show the real subject of the story: the thing discovered, a figure from the paper, or the historical person a problem is named after. A photo of a living person only when the file page names them and they are the person the story is about. Never a generic stock or mood image, never an AI-generated image, and never anything copied from a news site, a company blog or a press release.
   - The licence must be certain. Use Wikimedia Commons, and ask its API for the licence: `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1200&titles=File:<name>`. Accept only LicenseShortName values that are Public domain, CC0, CC BY or CC BY-SA (any version). NASA images and figures from papers published under CC BY are also fine when the page states the licence. If you cannot confirm the licence from the page itself, add no picture.
   - Download the `thumburl` with curl (send a plain User-Agent such as "ledger-site-build/1.0") to `static/images/<entry id>.jpg` (or .png/.webp to match the file), keep it under 600 KB, and add to the entry: "image": { "file": "<entry id>.jpg", "width": <thumbwidth>, "height": <thumbheight>, "alt": "what the picture shows", "caption": "one plain sentence", "credit": "Wikimedia Commons" (or the author named on the file page), "license": "Public domain" (the licence as given), "source": "<the file page URL>" }.
   - A chart is for a story whose own `sum` compares 2 to 6 numbers of the same kind, read in a source you fetched: "chart": { "title": "what is measured", "unit": "%", "bars": [{ "label": "...", "value": 7 }], "note": "optional one-line caveat" }. Largest bar first. Never estimate a value.

7. Set `checked` to today's date in America/New_York, even when nothing else changed.

8. Run `node build.mjs`. It checks the file and stops with a list of problems if anything is malformed; fix them and run it again until it prints "Built N entries". Then run `git diff --stat` and run `git status --short` too, and confirm the only changes are data/entries.json and any new files in static/images/ (dist/ is ignored). Undo any other change.

9. Commit directly on main, with a message whose first line is "Ledger update YYYY-MM-DD" followed by one line per change ("Added: <title>", "Updated: <title>"), or "No new entries" when only the date moved. Then `git push origin main`. If the push is rejected because main moved, run `git pull --rebase origin main`, run `node build.mjs` again, and push once more. Do not open a pull request and do not push to any other branch.

10. Finish with a short summary: entries added (title, main source), entries updated, pictures or charts added (with each picture's licence and file page), sources you couldn't fetch, or "nothing met the bar this run".
