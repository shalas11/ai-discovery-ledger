Draft this week's issue of "AI Discovery Ledger Weekly", the Friday email for the AI Discovery Ledger (https://aidiscoveryledger.com), a news site about scientific and technical discoveries made by AI systems. You are running unattended in a fresh checkout of https://github.com/shalas11/ai-discovery-ledger: don't ask questions, and finish the whole job. You only read the repository; never commit or push. Steve reviews the draft and sends it from Buttondown himself, so nothing you do here is sent to anyone.

1. Work out the dates. Today is the issue date (America/New_York, `TZ=America/New_York date +%F`). The issue week is the seven days ending yesterday (Friday through Thursday). The issue number is 1 plus the number of whole weeks from 2026-11-20 to today, never less than 1.

2. Read README.md, then data/entries.json. From it collect:
   - New this week: entries whose `logged` date (or `date`, when there is no `logged`) falls in the issue week.
   - Follow-ups this week: run `git log --since="8 days ago" -p -- data/entries.json` and note existing entries whose `open` text or sources changed in the week.
   - The count: how many entries are new this week, and the total.

3. Write the issue in this order:
   - **The lead.** The week's biggest discovery, explained for a curious non-specialist in about 200 words: what was found, who found it and with which AI system, why it matters, and what is still unverified. Title it as a news headline, not "The lead".
   - **Also this week.** Every other new entry: a bold short headline, then two or three sentences, then its main source as a link.
   - **Follow-ups.** Only if there were any: one or two sentences each on what changed for an earlier story. Leave the section out when there are none.
   - **The count.** One sentence: how many discoveries were logged this week and how many the ledger holds in total.
   Then a subject line that names the week's biggest discovery (not the issue number), and one preview line of about 90 characters.

4. Rules for the writing: this is news, so report what was found; don't rate or grade claims. Only state facts that are in data/entries.json (its `sum`, `open` and sources). Don't look anything up on the web and don't add numbers, names or dates that aren't there. Link each item to its source URLs from `src`, and to its ledger page at https://aidiscoveryledger.com/entry/<id>/. Plain words, sentences under 25 words, no hype ("breakthrough", "game-changing", "revolutionary"), no em dashes, no emoji. About a three-minute read in total (600 to 800 words). If the week had nothing new, still write a short issue and say so in the note to Steve.

5. Put the draft in a new Claude Doc with the Claude Docs connector (load its tools with ToolSearch, query "Claude_Docs", if they are deferred; call its `guide` tool with items ["topic.index"] once before anything else and follow it). Name the doc "AI Discovery Ledger Weekly, Issue <N> draft (<D Mon YYYY>)". Its layout:
   - Title, then the byline the guide describes (date chip for today · mention of "me").
   - "Subject line" and "Preview" as two short labelled lines.
   - The parts above as `##` sections.
   - Last line, in italics: "This newsletter is written from the AI Discovery Ledger, updated twice a day. Reply to this email with tips or corrections."
   - A `## Before you send` section for Steve only (not part of the email): a short checklist of anything he should check, such as a story resting on one source, a week with nothing new, or a story whose `open` text looks out of date.
   - A final `## Paste into Buttondown` section. Its first line tells Steve: "In Buttondown: new email, Actions, Markdown mode. Paste the subject line above as the subject and the block below as the body." Then one fenced `html` code block holding the complete designed email. Build that HTML from `tools/email-example.html` in the repository: read the file and keep its structure, its inline styles and its order exactly (issue line, masthead, the lead with its "Still unverified" box and links, "Also this week" items, the count line, the closing line), replacing only the words, dates, links and the number of "Also this week" items with this issue's. Add a "Follow-ups" block in the same style as "Also this week" only when the issue has follow-ups. Rules that keep it rendering: no blank lines anywhere inside the HTML, no line indented, every style inline, no `<style>` or `<script>` tags, no images.
   Write the whole draft before creating the doc, then create it with its outline and fill it section by section as the guide says.

6. Send Steve a push notification: "Issue <N> draft is ready: <subject line>", with the doc's link.

7. Finish with a short summary: the doc link, the subject line, and how many items are in each part.
