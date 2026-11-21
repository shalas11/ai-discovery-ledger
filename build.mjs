#!/usr/bin/env node
// Builds the whole site into dist/ from data/entries.json. No dependencies.
//   node build.mjs
// SITE_URL overrides site.config.json's siteUrl (the deploy workflow sets it, so the
// site works both at <user>.github.io/<repo>/ and at the custom domain).
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "dist");
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const ledger = JSON.parse(readFileSync(join(ROOT, "data", "entries.json"), "utf8"));

const SITE_URL = (process.env.SITE_URL || config.siteUrl).replace(/\/+$/, "");
const BASE = new URL(SITE_URL + "/").pathname; // "/" or "/repo-name/"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TAGLINE = "News of scientific and technical discoveries made by AI systems";

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
    for (const k of ["field", "title", "who", "sum"]) if (typeof e[k] !== "string" || !e[k].trim()) errs.push(`${at}: "${k}" is missing`);
    for (const k of ["system", "open"]) if (e[k] != null && typeof e[k] !== "string") errs.push(`${at}: "${k}" must be text`);
    if (!Array.isArray(e.src) || !e.src.length) errs.push(`${at}: needs at least one source`);
    for (const s of e.src || []) if (!s || !s.label || !isUrl(s.url)) errs.push(`${at}: each source needs a label and an http(s) url`);
    if (e.image != null) {
      const im = e.image;
      if (typeof im.file !== "string" || !/^[a-z0-9][a-z0-9._-]*.(jpg|jpeg|png|webp)$/.test(im.file)) errs.push(`${at}: image.file must be a plain .jpg, .png or .webp file name`);
      else if (!existsSync(join(ROOT, "static", "images", im.file))) errs.push(`${at}: static/images/${im.file} does not exist`);
      if (!(im.width > 0) || !(im.height > 0)) errs.push(`${at}: image needs its width and height in pixels`);
      for (const k of ["alt", "credit", "license"]) if (typeof im[k] !== "string" || !im[k].trim()) errs.push(`${at}: image.${k} is missing`);
      if (!isUrl(im.source)) errs.push(`${at}: image.source must be the http(s) page the image came from`);
    }
    if (e.chart != null) {
      const c = e.chart;
      if (typeof c.title !== "string" || !c.title.trim()) errs.push(`${at}: chart.title is missing`);
      if (!Array.isArray(c.bars) || c.bars.length < 2 || c.bars.length > 6) errs.push(`${at}: chart needs 2 to 6 bars`);
      for (const bar of c.bars || []) if (!bar || !bar.label || !(bar.value > 0)) errs.push(`${at}: each chart bar needs a label and a value above zero`);
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
const thisYear = ledger.checked.slice(0, 4);
const withYear = (iso, text) => (iso.slice(0, 4) === thisYear ? text : `${text}, ${iso.slice(0, 4)}`);
const fmtFull = (iso) => { const d = utc(iso); return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const fmtLong = (iso) => { const d = utc(iso); return withYear(iso, `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`); };
const fmtShort = (iso) => { const d = utc(iso); return withYear(iso, `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`); };
const rfc822 = (iso) => new Date(iso + "T12:00:00Z").toUTCString();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const entryPath = (e) => `${BASE}entry/${e.id}/`;
const fieldPath = (f) => `${BASE}field/${slug(f)}/`;
const abs = (path) => SITE_URL + path.slice(BASE.length - 1);
const clip = (s, n) => { if (s.length <= n) return s; const cut = s.slice(0, n - 1); return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "") + "…"; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const entries = ledger.entries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const lastTouched = (e) => [e.date, e.logged].filter(Boolean).sort().pop();
const counts = {};
for (const e of entries) counts[e.field] = (counts[e.field] || 0) + 1;
const fields = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));

const sources = (e) => `<p class="src">Sources: ${e.src.map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(", ")}</p>`;
const byline = (e) => esc(e.who + (e.system ? " · " + e.system : ""));
const imagePath = (e) => `${BASE}images/${e.image.file}`;
// A picture: beside the text when it is tall (a portrait), across the column when it is wide.
function figure(e) {
  const im = e.image;
  if (!im) return "";
  const side = im.height >= im.width * 0.9;
  return `<figure class="figure${side ? " side" : ""}"><img src="${imagePath(e)}" width="${im.width}" height="${im.height}" alt="${esc(im.alt)}" decoding="async"><figcaption>${im.caption ? esc(im.caption) + " " : ""}<span class="credit">Image: <a href="${esc(im.source)}" rel="noopener">${esc(im.credit)}</a>, ${esc(im.license.toLowerCase())}.</span></figcaption></figure>`;
}
// A small bar chart from the story's own numbers: one row per bar, name and figure in text.
function chart(e) {
  const c = e.chart;
  if (!c) return "";
  const max = Math.max(...c.bars.map((x) => x.value));
  const rows = c.bars.map((x) => { const v = `${x.value}${c.unit || ""}`; return `<div class="bar-row" title="${esc(x.label)}: ${esc(v)}"><span class="bar-label">${esc(x.label)}</span><span class="bar-value">${esc(v)}</span><span class="bar-track" aria-hidden="true"><span class="bar" style="width:${((x.value / max) * 100).toFixed(1)}%"></span></span></div>`; }).join("");
  return `<figure class="chart"><figcaption class="label">${esc(c.title)}</figcaption><div class="bars">${rows}</div>${c.note ? `<p class="chart-note">${esc(c.note)}</p>` : ""}</figure>`;
}
const ogImage = (e) => (e && e.image && e.image.width >= 1000 && e.image.width / e.image.height >= 1.5 ? abs(imagePath(e)) : `${SITE_URL}/og.png`);
const unverified = (e) => (e.open ? `<div class="unverified"><p class="label">Still unverified</p><p>${esc(e.open)}</p></div>` : "");

/* ---------- shared page shell ---------- */
function masthead(current, big) {
  const cur = (key) => (key === current ? ` aria-current="page"` : "");
  return `  <div class="util">
    <span>Updated <time datetime="${ledger.checked}">${fmtFull(ledger.checked)}</time></span>
    <nav aria-label="Utility"><a href="#weekly">Weekly email</a><a href="${BASE}feed.xml">RSS</a><a href="${BASE}about/"${cur("about")}>About</a></nav>
  </div>
  <header class="masthead${big ? "" : " small"}">
    <a class="name" href="${BASE}">${esc(config.name)}</a>${big ? `\n    <p>${TAGLINE}</p>` : ""}
  </header>
  <nav class="fields" aria-label="Fields">
    <a href="${BASE}"${cur("home")}>Latest</a>
    ${fields.map((f) => `<a href="${fieldPath(f)}"${cur(f)}>${esc(f)}</a>`).join("\n    ")}
    <a href="${BASE}archive/"${cur("archive")}>Archive</a>
  </nav>`;
}

function signup() {
  const user = (config.buttondownUsername || "").trim();
  const form = user
    ? `<form class="signup-form" action="https://buttondown.com/api/emails/embed-subscribe/${esc(user)}" method="post">
      <div class="signup-field"><label for="bd-email">Email address</label><input type="email" name="email" id="bd-email" required autocomplete="email" placeholder="you@example.com"></div>
      <button type="submit">Sign up</button>
    </form>`
    : `<p class="soon">The first issue is on its way. Until then, <a href="${BASE}feed.xml">follow new entries by RSS</a>.</p>`;
  return `  <section class="signup" id="weekly" aria-labelledby="weekly-h">
    <div>
      <h2 id="weekly-h">${esc(config.newsletterName)}</h2>
      <p>One email every Friday: the week's biggest discovery explained in plain words, plus everything else that was logged.</p>
    </div>
    ${form}
  </section>`;
}

function page({ title, description, path, type = "website", current, big = false, body, head = "", script = false, image = `${SITE_URL}/og.png` }) {
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
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="AI Discovery Ledger: news of discoveries made by AI systems">
<meta name="twitter:card" content="summary_large_image">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#fdfdfc">
<link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${BASE}icon-512.png">
<link rel="alternate" type="application/rss+xml" title="${esc(config.name)}" href="${BASE}feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE}assets/site.css">
${head}</head>
<body>
<div class="wrap">
${masthead(current, big)}

${body}

${signup()}

  <footer>
    <span>Entries are added daily from primary sources and science reporting.</span>
    <span><a href="${BASE}about/">About</a> · <a href="${BASE}archive/">Archive</a> · <a href="${BASE}feed.xml">RSS</a></span>
  </footer>
</div>
${script ? `<script src="${BASE}assets/site.js" defer></script>\n` : ""}</body>
</html>
`;
}

/* ---------- home: lead story, latest list, more grid ---------- */
function home() {
  const [lead, ...rest] = entries;
  const latest = rest.slice(0, 5), more = rest.slice(5, 11);
  const leadHtml = lead
    ? `<article class="lead">
      <p class="label accent">${esc(lead.field)} · <time datetime="${lead.date}">${fmtLong(lead.date)}</time></p>
      <h1><a href="${entryPath(lead)}">${esc(lead.title)}</a></h1>
      <p class="byline">${byline(lead)}</p>
      ${figure(lead)}
      <p class="sum">${esc(lead.sum)}</p>
      ${chart(lead)}
      ${unverified(lead)}
      ${sources(lead)}
    </article>`
    : `<p class="empty">No entries logged yet.</p>`;
  const latestHtml = latest.length
    ? `<aside class="latest" aria-labelledby="latest-h">
      <h2 class="label" id="latest-h">Latest</h2>
      ${latest.map((e) => `<a class="item" href="${entryPath(e)}"><span class="meta">${esc(e.field)} · ${fmtShort(e.date)}</span><span class="title">${esc(e.title)}</span></a>`).join("\n      ")}
    </aside>`
    : "";
  const moreHtml = more.length
    ? `  <section class="more" aria-labelledby="more-h">
    <h2 class="label" id="more-h">More discoveries</h2>
    <div class="grid">
      ${more.map((e) => `<article><p class="meta">${esc(e.field)} · ${fmtShort(e.date)}</p><h3><a href="${entryPath(e)}">${esc(e.title)}</a></h3><p>${esc(clip(e.sum, 190))}</p></article>`).join("\n      ")}
    </div>
    <p class="all-link"><a href="${BASE}archive/">See all ${entries.length} discoveries</a></p>
  </section>`
    : "";
  return page({
    title: `${config.name}: discoveries made by AI, logged daily`,
    description: config.description,
    path: BASE,
    current: "home",
    big: true,
    body: `  <main class="front">
    ${leadHtml}
    ${latestHtml}
  </main>

${moreHtml}`,
  });
}

/* ---------- lists: the archive and one page per field ---------- */
function rows(list) {
  let out = "", month = null;
  for (const e of list) {
    const key = e.date.slice(0, 7);
    if (key !== month) {
      if (month) out += `    </section>\n`;
      month = key;
      const d = utc(e.date);
      out += `    <section class="month"><h2 class="label">${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}</h2>\n`;
    }
    out += `      <a class="row" href="${entryPath(e)}"><time datetime="${e.date}">${fmtShort(e.date)}</time><span class="row-main"><span class="title">${esc(e.title)}</span><span class="meta">${esc(e.field)} · ${esc(e.who)}</span></span></a>\n`;
  }
  return month ? out + `    </section>\n` : out;
}

function archivePage() {
  return page({
    title: `Archive · ${config.name}`,
    description: `All ${entries.length} discoveries in the ${config.name}, newest first.`,
    path: `${BASE}archive/`,
    current: "archive",
    script: true,
    body: `  <main class="listing">
    <div class="listing-head">
      <div><h1>Archive</h1><p class="count">${plural(entries.length, "discovery", "discoveries")}, newest first</p></div>
      <div class="search" id="search" hidden><label for="q">Search</label><input id="q" type="search" placeholder="Titles, labs, AI systems"></div>
    </div>
    <div id="rows">
${rows(entries)}    </div>
    <p class="empty" id="empty" hidden>Nothing matches that search.</p>
  </main>`,
  });
}

function fieldPage(f) {
  const list = entries.filter((e) => e.field === f);
  return page({
    title: `${f} · ${config.name}`,
    description: `${plural(list.length, "discovery", "discoveries")} in ${f.toLowerCase()} made by AI systems, newest first.`,
    path: fieldPath(f),
    current: f,
    body: `  <main class="listing">
    <div class="listing-head">
      <div><h1>${esc(f)}</h1><p class="count">${plural(list.length, "discovery", "discoveries")}, newest first</p></div>
    </div>
${rows(list)}  </main>`,
  });
}

/* ---------- one page per entry ---------- */
function entryPage(e, i) {
  const newer = entries[i - 1], older = entries[i + 1];
  const ld = {
    "@context": "https://schema.org", "@type": "NewsArticle",
    headline: clip(e.title, 110), description: clip(e.sum, 300),
    datePublished: e.logged || e.date, dateModified: lastTouched(e),
    mainEntityOfPage: abs(entryPath(e)),
    publisher: { "@type": "Organization", name: config.name, url: SITE_URL + "/" },
  };
  return page({
    title: `${e.title} · ${config.name}`,
    description: clip(e.sum, 240),
    path: entryPath(e),
    type: "article",
    image: ogImage(e),
    current: e.field,
    body: `  <main>
  <article class="story">
    <p class="label accent"><a href="${fieldPath(e.field)}">${esc(e.field)}</a> · <time datetime="${e.date}">${fmtFull(e.date)}</time></p>
    <h1>${esc(e.title)}</h1>
    <p class="byline">${byline(e)}</p>
    ${figure(e)}
    <p class="sum">${esc(e.sum)}</p>
    ${chart(e)}
    ${unverified(e)}
    ${sources(e)}
  </article>
  </main>

  <nav class="pager" aria-label="More entries">
    ${newer ? `<a href="${entryPath(newer)}"><span class="label">Newer</span><span class="title">${esc(newer.title)}</span></a>` : `<span></span>`}
    ${older ? `<a class="older" href="${entryPath(older)}"><span class="label">Older</span><span class="title">${esc(older.title)}</span></a>` : `<span></span>`}
  </nav>`,
    head: `<meta property="article:published_time" content="${e.logged || e.date}">\n<meta property="article:section" content="${esc(e.field)}">\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n`,
  });
}

function aboutPage() {
  return page({
    title: `About · ${config.name}`,
    description: config.description,
    path: `${BASE}about/`,
    current: "about",
    body: `  <main>
  <article class="story">
    <h1>About the ledger</h1>
    <p class="sum">The ${esc(config.name)} publishes news of scientific and technical discoveries made by AI systems: new proofs, designs that worked in the lab, new algorithms, patterns in data that people had missed.</p>
    <p>A result belongs here when an AI system produced the central finding. New model releases, funding rounds, benchmark scores and product launches are left out, as are results where AI only sped up routine work.</p>
    <p>Each entry says what was found, who found it and with which system, and links its sources. Summaries are written from those sources. Where a lab is the only source for its own claim, the entry says so, and the "Still unverified" note says what has not been checked yet. When follow-up news arrives, that note is rewritten.</p>
    <p>New entries are added daily. A weekly email goes out every Friday.</p>
  </article>
  </main>`,
  });
}

function notFound() {
  return page({
    title: `Page not found · ${config.name}`,
    description: config.description,
    path: BASE + "404.html",
    body: `  <main>
  <article class="story">
    <h1>Nothing is logged at this address.</h1>
    <p class="sum">The entry may have been renamed. Try the <a href="${BASE}archive/">archive</a>, which lists every discovery and can be searched.</p>
  </article>
  </main>`,
    head: `<meta name="robots" content="noindex">\n`,
  });
}

/* ---------- RSS: one item per entry ---------- */
function rss() {
  const items = entries.map((e) => {
    const link = abs(entryPath(e));
    const html = `<p>${esc(e.field)} · ${esc(e.who)}</p><p>${esc(e.sum)}</p>${e.open ? `<p><strong>Still unverified:</strong> ${esc(e.open)}</p>` : ""}<p>${e.src.map((s) => `<a href="${esc(s.url)}">${esc(s.label)}</a>`).join(" · ")}</p>`;
    return { date: e.logged || e.date, title: e.title, link, category: e.field, html };
  });
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const xml = items.slice(0, 60).map((it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="true">${esc(it.link)}</guid>
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
  const urls = [[SITE_URL + "/", ledger.checked], [abs(`${BASE}archive/`), ledger.checked], [abs(`${BASE}about/`), ledger.checked]]
    .concat(fields.map((f) => [abs(fieldPath(f)), ledger.checked]))
    .concat(entries.map((e) => [abs(entryPath(e)), lastTouched(e)]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${esc(u)}</loc><lastmod>${d}</lastmod></url>`).join("\n")}
</urlset>
`;
}

/* ---------- write ---------- */
const write = (rel, text) => { const p = join(OUT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, "static"), OUT, { recursive: true });
write("index.html", home());
write("archive/index.html", archivePage());
write("about/index.html", aboutPage());
for (const f of fields) write(`field/${slug(f)}/index.html`, fieldPage(f));
entries.forEach((e, i) => write(`entry/${e.id}/index.html`, entryPage(e, i)));
write("feed.xml", rss());
write("sitemap.xml", sitemap());
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write("404.html", notFound());
write("entries.json", JSON.stringify(ledger));
console.log(`Built ${entries.length} entries for ${SITE_URL} (base ${BASE}), last updated ${ledger.checked}`);
