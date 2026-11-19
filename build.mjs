#!/usr/bin/env node
// Builds the whole site into dist/ from data/entries.json. No dependencies.
//   node build.mjs
// SITE_URL overrides site.config.json's siteUrl (the deploy workflow sets it, so the
// site works both at <user>.github.io/<repo>/ and at the custom domain).
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "dist");
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const ledger = JSON.parse(readFileSync(join(ROOT, "data", "entries.json"), "utf8"));

const SITE_URL = (process.env.SITE_URL || config.siteUrl).replace(/\/+$/, "");
const BASE = new URL(SITE_URL + "/").pathname; // "/" or "/repo-name/"

const GRADES = {
  announced: { label: "Announced", level: 1, color: "var(--s1)", desc: "The lab or company that did the work is the only source. No outside check is on record." },
  machine: { label: "Machine-checked", level: 2, color: "var(--s2)", desc: "A formal proof compiles in a proof assistant such as Lean. People have not yet confirmed that it proves what the announcement says." },
  peer: { label: "Peer-reviewed", level: 3, color: "var(--s3)", desc: "Published in a refereed journal, usually with lab or clinical data behind it." },
  confirmed: { label: "Independently confirmed", level: 4, color: "var(--s4)", desc: "Outside experts have checked, reproduced or built on the result." },
  contested: { label: "Contested", level: 0, color: "var(--sx)", desc: "Retractions, a credit dispute or a serious unresolved objection are on record." },
};
const LADDER = ["confirmed", "peer", "machine", "announced", "contested"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------- validation: a bad daily update should fail the build, not break the site ---------- */
function validate() {
  const errs = [];
  const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
  const isUrl = (s) => typeof s === "string" && /^https?:\/\/\S+$/.test(s);
  if (!isDate(ledger.checked)) errs.push(`"checked" must be a YYYY-MM-DD date`);
  if (!Array.isArray(ledger.entries)) errs.push(`"entries" must be a list`);
  const seen = new Set();
  for (const [i, e] of (ledger.entries || []).entries()) {
    const at = `entry ${i + 1} (${e && e.id ? e.id : "no id"})`;
    if (!e || typeof e !== "object") { errs.push(`${at}: not an object`); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id || "")) errs.push(`${at}: id must be lowercase letters, digits and hyphens`);
    if (seen.has(e.id)) errs.push(`${at}: duplicate id`);
    seen.add(e.id);
    if (!isDate(e.date)) errs.push(`${at}: date must be YYYY-MM-DD`);
    if (e.logged != null && !isDate(e.logged)) errs.push(`${at}: logged must be YYYY-MM-DD`);
    if (!GRADES[e.grade]) errs.push(`${at}: grade must be one of ${Object.keys(GRADES).join(", ")}`);
    for (const k of ["field", "title", "who", "sum"]) if (typeof e[k] !== "string" || !e[k].trim()) errs.push(`${at}: "${k}" is missing`);
    for (const k of ["system", "open"]) if (e[k] != null && typeof e[k] !== "string") errs.push(`${at}: "${k}" must be text`);
    if (!Array.isArray(e.src) || !e.src.length) errs.push(`${at}: needs at least one source`);
    for (const s of e.src || []) if (!s || !s.label || !isUrl(s.url)) errs.push(`${at}: each source needs a label and an http(s) url`);
    for (const h of e.history || []) {
      if (!isDate(h.date) || !GRADES[h.from] || !GRADES[h.to]) errs.push(`${at}: each history item needs date, from and to (valid grades)`);
    }
  }
  if (errs.length) {
    console.error("data/entries.json has problems:\n  - " + errs.join("\n  - "));
    process.exit(1);
  }
}
validate();

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const utc = (iso) => new Date(iso + "T00:00:00Z");
const fmtDate = (iso) => { const d = utc(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const fmtShort = (iso) => { const d = utc(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const rfc822 = (iso) => new Date(iso + "T12:00:00Z").toUTCString();
const entryPath = (e) => `${BASE}entry/${e.id}/`;
const abs = (path) => SITE_URL + path.slice(BASE.length - 1);
const clip = (s, n) => { if (s.length <= n) return s; const cut = s.slice(0, n - 1); return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "") + "…"; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const entries = ledger.entries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const lastTouched = (e) => [e.date, e.logged, ...(e.history || []).map((h) => h.date)].filter(Boolean).sort().pop();

function bars(grade) {
  const lvl = GRADES[grade].level;
  let out = `<span class="bars" aria-hidden="true">`;
  for (let i = 1; i <= 4; i++) out += i <= lvl ? `<i class="on"></i>` : `<i></i>`;
  return out + `</span>`;
}
const evidence = (grade) => `<span class="evidence">${bars(grade)}${esc(GRADES[grade].label)}</span>`;
const sources = (e) => `<div class="src">Source:${e.src.map((s) => ` <a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join("")}</div>`;
const whoLine = (e) => `<p class="who">${esc(e.who + (e.system ? " · " + e.system : ""))}</p>`;
const openBlock = (e) => (e.open ? `<p class="open"><b>Still open</b>${esc(e.open)}</p>` : "");

/* ---------- shared page shell ---------- */
function signup() {
  const user = (config.buttondownUsername || "").trim();
  const body = user
    ? `<form class="signup-form" action="https://buttondown.com/api/emails/embed-subscribe/${esc(user)}" method="post">
      <label for="bd-email">Email address</label>
      <div class="row"><input type="email" name="email" id="bd-email" required autocomplete="email" placeholder="you@example.com"><button type="submit">Sign up</button></div>
    </form>
    <p class="caption">Unsubscribe from any issue. Prefer a feed reader? <a href="${BASE}feed.xml">Follow by RSS</a>.</p>`
    : `<p class="soon">The first issue is on its way. Until then, <a href="${BASE}feed.xml">follow new entries by RSS</a>.</p>`;
  return `<section class="signup" id="weekly" aria-labelledby="weekly-h">
    <h2 id="weekly-h">${esc(config.newsletterName)}</h2>
    <p>One email every Friday, about a three-minute read: the week's lead result, the grades that moved up or down, what else was logged, and what is still open.</p>
    ${body}
  </section>`;
}

function page({ title, description, path, type = "website", body, head = "", script = false }) {
  const url = abs(path);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(SITE_URL)}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="AI Discovery Ledger: AI-made discoveries, graded by how well they have been checked">
<meta name="twitter:card" content="summary_large_image">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(config.name)}" href="${BASE}feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE}assets/site.css">
${head}</head>
<body>
<div class="wrap">
${body}
  <footer>
    <p>Entries are added once a day from primary sources and science reporting. Grades reflect the public record on the date last checked.</p>
    <p><a href="${BASE}">All entries</a> · <a href="${BASE}#method">How entries are graded</a> · <a href="${BASE}#weekly">Weekly email</a> · <a href="${BASE}feed.xml">RSS</a></p>
  </footer>
</div>
${script ? `<script src="${BASE}assets/site.js" defer></script>\n` : ""}</body>
</html>
`;
}

/* ---------- home ---------- */
function home() {
  const n = entries.length;
  const solid = entries.filter((e) => e.grade === "peer" || e.grade === "confirmed").length;
  const latest = entries[0] ? utc(entries[0].date) : utc(ledger.checked);
  const tally = [["Entries logged", String(n)], ["Peer-reviewed or confirmed", `${solid} of ${n}`], ["Latest entry", `${latest.getUTCDate()} ${MONTHS[latest.getUTCMonth()]}`]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  // one column per month, first entry's month through the month last checked
  let months = "";
  if (n) {
    const first = entries[n - 1].date, end = ledger.checked > entries[0].date ? ledger.checked : entries[0].date;
    let y = +first.slice(0, 4), m = +first.slice(5, 7);
    const ey = +end.slice(0, 4), em = +end.slice(5, 7);
    for (let guard = 0; (y < ey || (y === ey && m <= em)) && guard < 120; guard++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const ticks = entries.filter((e) => e.date.startsWith(key)).reverse()
        .map((e) => `<a class="tick${e.grade === "contested" ? " contested" : ""}" style="--c:${GRADES[e.grade].color}" href="${entryPath(e)}" title="${esc(e.title)}" aria-label="${esc(e.title)}"></a>`).join("");
      const label = MONTHS[m - 1] + (m === 1 || key === first.slice(0, 7) ? " ’" + String(y).slice(2) : "");
      months += `<div class="month"><div class="stack">${ticks}</div><span class="mlabel">${label}</span></div>`;
      m++; if (m > 12) { m = 1; y++; }
    }
  }

  const counts = {};
  for (const e of entries) counts[e.field] = (counts[e.field] || 0) + 1;
  const fields = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  const chips = [`<button class="chip" type="button" data-field="All" aria-pressed="true">All<small>${n}</small></button>`]
    .concat(fields.map((f) => `<button class="chip" type="button" data-field="${esc(f)}" aria-pressed="false">${esc(f)}<small>${counts[f]}</small></button>`)).join("");

  let feed = "", day = null;
  for (const e of entries) {
    if (e.date !== day) {
      if (day) feed += `</section>\n`;
      day = e.date;
      const k = entries.filter((x) => x.date === day).length;
      feed += `<section class="day"><h2><time datetime="${day}">${fmtDate(day)}</time><span>${plural(k, "entry", "entries")}</span></h2>\n`;
    }
    feed += `<article class="entry" id="e-${e.id}" style="--c:${GRADES[e.grade].color}" data-field="${esc(e.field)}" data-grade="${e.grade}">
  <div class="meta"><span class="field">${esc(e.field)}</span>${evidence(e.grade)}</div>
  <h3><a href="${entryPath(e)}">${esc(e.title)}</a></h3>
  ${whoLine(e)}
  <p class="sum">${esc(e.sum)}</p>
  ${openBlock(e)}
  ${sources(e)}
</article>\n`;
  }
  if (day) feed += `</section>\n`;
  if (!n) feed = `<p class="empty">No entries logged yet.</p>`;

  const ladder = LADDER.map((k) => `<li style="--c:${GRADES[k].color}">${bars(k)}<div><strong>${GRADES[k].label}</strong><span class="d">${GRADES[k].desc}</span></div></li>`).join("\n      ");

  const body = `  <header class="masthead">
    <div class="kicker"><span>Logged daily</span><span>Last checked <b><time datetime="${ledger.checked}">${fmtDate(ledger.checked)}</time></b></span></div>
    <h1>AI Discovery <span>Ledger</span></h1>
    <p class="thesis">A running record of scientific and technical results where an AI system did the discovering. Every entry carries a grade for how well the claim has been checked, because an announcement and a confirmed result are different things.</p>
    <p class="cta"><a href="#weekly">Get the weekly email</a><a href="${BASE}feed.xml">RSS</a></p>
  </header>

  <dl class="tally">${tally}</dl>

  <section class="months" aria-label="Entries by month">
    <div class="months-grid">${months}</div>
    <p class="caption">One block per entry, by month, colored by evidence grade. Hatched blocks are contested.</p>
  </section>

  <section class="filters" id="filters" aria-label="Filter the ledger" hidden>
    <div class="chips" id="fields" role="group" aria-label="Field">${chips}</div>
    <div class="row">
      <input id="q" type="search" placeholder="Search titles, labs, systems" aria-label="Search entries">
      <select id="grade" aria-label="Evidence grade">
        <option value="all">Any evidence grade</option>
        <option value="confirmed">Independently confirmed</option>
        <option value="peer">Peer-reviewed</option>
        <option value="machine">Machine-checked</option>
        <option value="announced">Announced only</option>
        <option value="contested">Contested</option>
      </select>
    </div>
  </section>

  <main id="feed">
${feed}<p class="empty" id="empty" hidden>No entries match these filters. Clear the search or pick another field.</p>
  </main>

  ${signup()}

  <section class="method" id="method">
    <h2>How entries are graded</h2>
    <p>Each entry gets the highest grade its public record supports on the day it is logged, and the grade is revised when the record changes.</p>
    <ul class="ladder">
      ${ladder}
    </ul>
    <h2>What gets logged</h2>
    <p>A result belongs here when an AI system produced the central finding: a proof, a design that worked in the lab, a new algorithm, a pattern in data that people had missed. New model releases, funding rounds, benchmark scores and product launches are left out, as are results where AI only sped up routine work.</p>
    <p>Summaries are written from the linked sources. Where a lab is the only source for its own claim, the entry says so.</p>
  </section>`;

  return page({
    title: `${config.name}: AI-made discoveries, graded by evidence`,
    description: config.description,
    path: BASE,
    body,
    script: true,
  });
}

/* ---------- one page per entry ---------- */
function entryPage(e, i) {
  const g = GRADES[e.grade];
  const newer = entries[i - 1], older = entries[i + 1];
  const rows = [];
  if (e.logged && e.logged !== e.date) rows.push([e.logged, "Added to the ledger", ""]);
  for (const h of e.history || []) rows.push([h.date, `${GRADES[h.from].label} → ${GRADES[h.to].label}`, h.note || ""]);
  rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const history = rows.length
    ? `<section class="history"><h2>Record</h2><ol>${rows.map(([d, what, note]) => `<li><time datetime="${d}">${fmtShort(d)}</time><div><strong>${esc(what)}</strong>${note ? `<span>${esc(note)}</span>` : ""}</div></li>`).join("")}</ol></section>`
    : "";
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: clip(e.title, 110), description: clip(e.sum, 300),
    datePublished: e.logged || e.date, dateModified: lastTouched(e),
    mainEntityOfPage: abs(entryPath(e)),
    publisher: { "@type": "Organization", name: config.name, url: SITE_URL + "/" },
  };
  const body = `  <nav class="topbar" aria-label="Site"><a class="brand" href="${BASE}">AI Discovery <span>Ledger</span></a><a href="${BASE}">All entries</a></nav>

  <main>
  <article class="entry single" style="--c:${g.color}">
    <div class="meta"><span class="field">${esc(e.field)}</span>${evidence(e.grade)}<time datetime="${e.date}">${fmtDate(e.date)}</time></div>
    <h1 class="entry-title">${esc(e.title)}</h1>
    ${whoLine(e)}
    <p class="sum">${esc(e.sum)}</p>
    ${openBlock(e)}
    ${sources(e)}
    <p class="grade-note">${bars(e.grade)}<span><strong>${esc(g.label)}.</strong> ${esc(g.desc)} <a href="${BASE}#method">How entries are graded</a></span></p>
    ${history}
  </article>
  </main>

  <nav class="pager" aria-label="More entries">
    ${newer ? `<a class="newer" href="${entryPath(newer)}"><small>Newer</small>${esc(newer.title)}</a>` : `<span></span>`}
    ${older ? `<a class="older" href="${entryPath(older)}"><small>Older</small>${esc(older.title)}</a>` : `<span></span>`}
  </nav>

  ${signup()}`;
  return page({
    title: `${e.title} · ${config.name}`,
    description: `${g.label}. ${clip(e.sum, 220)}`,
    path: entryPath(e),
    type: "article",
    body,
    head: `<meta property="article:published_time" content="${e.logged || e.date}">\n<meta property="article:section" content="${esc(e.field)}">\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n`,
  });
}

/* ---------- RSS: new entries and grade changes ---------- */
function rss() {
  const items = [];
  for (const e of entries) {
    const g = GRADES[e.grade], link = abs(entryPath(e));
    const html = `<p><strong>${esc(g.label)}</strong> · ${esc(e.field)} · ${esc(e.who)}</p><p>${esc(e.sum)}</p>${e.open ? `<p><strong>Still open:</strong> ${esc(e.open)}</p>` : ""}<p>${e.src.map((s) => `<a href="${esc(s.url)}">${esc(s.label)}</a>`).join(" · ")}</p>`;
    items.push({ date: e.logged || e.date, title: e.title, link, guid: link, category: e.field, html });
    for (const h of e.history || []) {
      items.push({
        date: h.date, title: `Regraded: ${e.title} (${GRADES[h.from].label} → ${GRADES[h.to].label})`, link,
        guid: `${link}#regraded-${h.date}`, category: e.field,
        html: `<p><strong>${esc(GRADES[h.from].label)} → ${esc(GRADES[h.to].label)}</strong></p>${h.note ? `<p>${esc(h.note)}</p>` : ""}`,
      });
    }
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const xml = items.slice(0, 60).map((it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="${it.guid === it.link}">${esc(it.guid)}</guid>
      <pubDate>${rfc822(it.date)}</pubDate>
      <category>${esc(it.category)}</category>
      <description>${esc(it.html)}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(config.name)}</title>
    <link>${esc(SITE_URL)}/</link>
    <atom:link href="${esc(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(config.description)}</description>
    <language>en</language>
    <lastBuildDate>${rfc822(ledger.checked)}</lastBuildDate>
${xml}
  </channel>
</rss>
`;
}

function sitemap() {
  const urls = [[SITE_URL + "/", ledger.checked]].concat(entries.map((e) => [abs(entryPath(e)), lastTouched(e)]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${esc(u)}</loc><lastmod>${d}</lastmod></url>`).join("\n")}
</urlset>
`;
}

function notFound() {
  return page({
    title: `Page not found · ${config.name}`,
    description: config.description,
    path: BASE + "404.html",
    body: `  <nav class="topbar" aria-label="Site"><a class="brand" href="${BASE}">AI Discovery <span>Ledger</span></a><a href="${BASE}">All entries</a></nav>
  <main class="notfound"><h1 class="entry-title">Nothing is logged at this address.</h1><p>The entry may have been renamed. <a href="${BASE}">Go to the ledger</a> and search for it.</p></main>`,
    head: `<meta name="robots" content="noindex">\n`,
  });
}

/* ---------- write ---------- */
const write = (rel, text) => { const p = join(OUT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, "static"), OUT, { recursive: true });
write("index.html", home());
entries.forEach((e, i) => write(`entry/${e.id}/index.html`, entryPage(e, i)));
write("feed.xml", rss());
write("sitemap.xml", sitemap());
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write("404.html", notFound());
write("entries.json", JSON.stringify(ledger));
console.log(`Built ${entries.length} entries for ${SITE_URL} (base ${BASE}), last checked ${ledger.checked}`);
