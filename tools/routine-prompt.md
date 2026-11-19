Twice-daily update of the AI Discovery Ledger (https://github.com/shalas11/ai-discovery-ledger, live at https://shalas11.github.io/ai-discovery-ledger/). The ledger logs scientific and technical results where an AI system did the discovering, and grades each by how well the claim has been checked. You are running unattended in a fresh checkout of that repository: don't ask questions, and finish the whole job.

The only file you change is data/entries.json. README.md in the repo describes its format; read it first. Every page, the RSS feed and the sitemap are generated from that file by `node build.mjs`, and a push to main publishes the site within a minute through GitHub Actions.

1. Read data/entries.json. Note `checked` and every existing entry (id, title, date, grade, open).

2. Search the web for AI-made discoveries announced in the last 14 days (not only since `checked`: earlier runs once missed a result for 11 days). Run several searches: mathematics and proofs, computer science, algorithms and cryptography, biology, protein and genome design, medicine and drug candidates, physics, chemistry and materials. Also check deepmind.google/blog, openai.com/news, anthropic.com/news, research.google/blog, ScienceDaily's AI news, phys.org, Quanta Magazine, and arXiv coverage. Fetch the primary source for each candidate before logging it. If a source can't be fetched, say so in your summary rather than guessing what it says.

3. Inclusion bar: an AI system produced the central finding (a proof, a design that worked in the lab, a new algorithm, a pattern in data people had missed). Leave out model releases, funding, benchmark scores, product launches, opinion pieces, and work where AI only sped up routine tasks. Skip anything already in the ledger, including the same result under a different headline. Be selective: usually 0 to 3 new entries per run, and zero is fine.

4. Check whether the public record has changed for existing entries, especially ones graded announced, machine or contested: independent verification, a peer-reviewed publication, a retraction, a formal objection, a fix answering an objection. When it has, change that entry's `grade`, rewrite its `open` text to match the new record, add the new source to `src`, and append one item to its `history` list: `{ "date": "<today>", "from": "<old grade>", "to": "<new grade>", "note": "<one sentence on what changed>" }`. Create the `history` list if the entry has none. A change that adds information without moving the grade only updates `open` and `src`.

5. New entries go at the top of the `entries` list, newest first, in this exact shape:
   { "id": "YYYY-MM-DD-short-slug", "date": "YYYY-MM-DD", "logged": "<today>", "field": "...", "grade": "...", "title": "...", "who": "...", "system": "...", "sum": "...", "open": "...", "src": [{ "label": "...", "url": "https://..." }] }
   - `date` is the announcement or publication date. `logged` is today's date in America/New_York.
   - `id` is permanent (it is the entry's web address): lowercase letters, digits and hyphens, starting with `date`. Never change an existing id.
   - `field`: reuse an existing one (Mathematics, Computer science, Biology, Medicine, Physics) or a new plain one such as Chemistry, Materials, Astronomy, Engineering.
   - `grade`: announced = the lab or company is the only source; machine = a formal proof compiles but people haven't confirmed it matches the claim; peer = published in a refereed journal; confirmed = outside experts checked, reproduced or built on it; contested = retraction, credit dispute or serious unresolved objection.
   - Write `title`, `sum` (2 to 3 sentences, concrete numbers, plain words) and `open` (what is still unverified or limited, or "" if nothing) in your own words. Never copy sentences from a source. Only state facts you read in a source you fetched, and only use URLs you fetched.

6. Set `checked` to today's date in America/New_York, even when nothing else changed.

7. Run `node build.mjs`. It checks the file and stops with a list of problems if anything is malformed; fix them and run it again until it prints "Built N entries". Then run `git diff --stat` and confirm data/entries.json is the only changed file (dist/ is ignored). Undo any other change.

8. Commit directly on main, with a message whose first line is "Ledger update YYYY-MM-DD" followed by one line per change ("Added: <title> (<grade>)", "Regraded: <title>, <from> to <to>"), or "No new entries" when only the date moved. Then `git push origin main`. If the push is rejected because main moved, run `git pull --rebase origin main`, run `node build.mjs` again, and push once more. Do not open a pull request and do not push to any other branch.

9. Finish with a short summary: entries added (title, grade, main source), grade changes, sources you couldn't fetch, or "nothing met the bar this run".
