Draft this week's issue of "AI Discovery Ledger Weekly", the Friday email for the AI Discovery Ledger (https://aidiscoveryledger.com). You are running unattended in a fresh checkout of https://github.com/shalas11/ai-discovery-ledger: don't ask questions, and finish the whole job. You only read the repository; never commit or push. Steve reviews the draft and sends it from Buttondown himself, so nothing you do here is sent to anyone.

1. Work out the dates. Today is the issue date (America/New_York, `TZ=America/New_York date +%F`). The issue week is the seven days ending yesterday (Friday through Thursday). The issue number is 1 plus the number of whole weeks from 2026-11-20 to today, never less than 1.

2. Read README.md, then data/entries.json. From it collect:
   - New this week: entries whose `logged` date (or `date`, when there is no `logged`) falls in the issue week.
   - Grade changes this week: items in any entry's `history` list dated in the issue week (from, to, note).
   - The tally: total entries, how many are peer or confirmed, and the count for each grade.
   Also run `git log --since="8 days ago" --format="%h %ad %s" --date=short -- data/entries.json` to catch anything else that changed in the week (an `open` text rewritten, a source added).

3. Write the issue in five parts, in this order:
   - **The lead.** The week's most significant item, explained for a curious non-specialist in about 200 words: what was claimed, by whom, why it matters, the grade it holds and why it stops at that grade. Pick a grade change over a new entry when the change is bigger news. Title it as a headline, not "The lead".
   - **Up and down.** Every grade change in the week: "Up:" or "Down:" in bold with the entry and old → new grade, then the reason in one to three sentences. If there were none, write one sentence saying no grades moved.
   - **Also logged.** Every other new entry: a bold short name with its grade in brackets, then two or three sentences, then its main source as a link.
   - **Still open.** One thing to watch that could move a grade soon, taken from an entry's `open` text: what would move it up and what would move it down.
   - **The tally.** One sentence with the counts.
   Then a subject line that names the week's biggest movement (not the issue number), and one preview line of about 90 characters.

4. Rules for the writing: Always write grades with the labels readers see on the site, never the data codes: announced = Announced, machine = Machine-checked, peer = Peer-reviewed, confirmed = Independently confirmed, contested = Contested. only state facts that are in data/entries.json (its `sum`, `open`, `history` notes and sources). Don't look anything up on the web and don't add numbers, names or dates that aren't there. Link each item to its source URLs from `src`, and to its ledger page at https://aidiscoveryledger.com/entry/<id>/. Plain words, sentences under 25 words, no hype ("breakthrough", "game-changing", "revolutionary"), no em dashes, no emoji. About a three-minute read in total (600 to 800 words). If the week had no new entries and no grade changes, still write the issue, keep it short, and say so in the note to Steve.

5. Put the draft in a new Claude Doc with the Claude Docs connector (load its tools with ToolSearch, query "Claude_Docs", if they are deferred; call its `guide` tool with items ["topic.index"] once before anything else and follow it). Name the doc "AI Discovery Ledger Weekly, Issue <N> draft (<D Mon YYYY>)". Its layout:
   - Title, then the byline the guide describes (date chip for today · mention of "me").
   - "Subject line" and "Preview" as two short labelled lines.
   - The five parts as `##` sections.
   - Last line, in italics: "This newsletter is written from the AI Discovery Ledger, updated twice a day. Reply to this email if we graded something wrong."
   - A final `## Before you send` section for Steve only (not part of the email): a short checklist of anything he should check, such as a claim resting on one source, a week with nothing new, or an entry whose `open` text looks out of date.
   Write the whole draft before creating the doc, then create it with its outline and fill it section by section as the guide says.

6. Send Steve a push notification: "Issue <N> draft is ready: <subject line>", with the doc's link.

7. Finish with a short summary: the doc link, the subject line, and how many items are in each part.
