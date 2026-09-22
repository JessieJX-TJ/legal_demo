/**
 * Assemble a GitHub Pages–ready static site into github-pages-build/.
 * This project is already static (no Vite/Webpack); "build" = copy runtime assets,
 * normalize text encoding, inject a trailing-slash fix for project Pages URLs,
 * and verify that every HTML-referenced relative resource exists.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'github-pages-build');

const ROOT_FILES = [
  'index.html',
  'login.html',
  'app.js',
  'login.js',
  'login.css',
  'styles.css',
  'compliance-check.html',
  'compliance-check.js',
  'compliance-check.css',
  'compliance-report.js',
  'regulation-compare.html',
  'regulation-compare.js',
  'regulation-knowledge.html',
  'regulation-knowledge.js',
  'regulation-knowledge.css',
  'regulation-qa.html',
  'regulation-qa.js',
  'regulation-report.html',
  'regulation-report.js',
];

const DIRS = [
  { name: 'assets', filter: () => true },
  {
    name: 'css',
    filter: (name) => !name.startsWith('_tmp') && !name.startsWith('.'),
  },
  {
    name: 'js',
    filter: (name) => !name.startsWith('_') && !name.startsWith('.'),
  },
  { name: 'styles', filter: () => true },
  {
    name: 'vendor',
    filter: (name) => name === 'vue.global.prod.js' || name === 'vue.global.js',
  },
  { name: 'static', filter: () => true },
];

const TEXT_EXT = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.md']);

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stripBomBuffer(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3);
  }
  return buf;
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  const ext = path.extname(src).toLowerCase();
  if (TEXT_EXT.has(ext)) {
    fs.writeFileSync(dest, stripBomBuffer(fs.readFileSync(src)));
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyDirFiltered(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!filter(entry.name)) continue;
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(from, to, () => true);
    } else {
      copyFile(from, to);
    }
  }
}

function stripQuery(p) {
  return p.split('?')[0].split('#')[0];
}

function collectHtmlRefs(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const refs = new Set();
  const re = /(?<!:)\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1].trim();
    if (
      !u ||
      u.startsWith('data:') ||
      u.startsWith('mailto:') ||
      u.startsWith('javascript:') ||
      u.startsWith('http://') ||
      u.startsWith('https://') ||
      u.startsWith('#') ||
      u.includes('{{') ||
      u.includes('}}') ||
      /[|]/.test(u) ||
      /^[\w.$[\]]+$/.test(u)
    ) {
      continue;
    }
    if (u.startsWith('/')) {
      throw new Error(`Absolute site-root path in ${path.relative(OUT, htmlPath)}: ${u}`);
    }
    u = stripQuery(u);
    if (u.endsWith('/')) continue;
    refs.add(u);
  }
  return [...refs];
}

function resolveRef(fromHtml, rel) {
  const base = path.dirname(fromHtml);
  return path.normalize(path.join(base, rel));
}

function writeGhPagesBase() {
  const code = `/* GitHub Pages project-site path fix: /repo without trailing slash breaks ./ relative assets */
(function () {
  var path = location.pathname;
  if (path.slice(-1) !== '/' && !/\\.html?$/i.test(path)) {
    location.replace(path + '/' + location.search + location.hash);
  }
})();
`;
  fs.writeFileSync(path.join(OUT, 'js', 'gh-pages-base.js'), code);
}

function patchHtmlForPages() {
  const inject = '  <script src="./js/gh-pages-base.js"></script>\n';
  for (const name of fs.readdirSync(OUT)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(OUT, name);
    let html = fs.readFileSync(file, 'utf8');
    if (html.charCodeAt(0) === 0xfeff) html = html.slice(1);
    if (!html.includes('gh-pages-base.js')) {
      if (!/<head>/i.test(html)) {
        throw new Error(`Cannot inject Pages base fix: no <head> in ${name}`);
      }
      html = html.replace(/<head>/i, `<head>\n${inject}`);
    }
    // If Vue fails to load, lift v-cloak so the page is not an unexplained blank screen
    html = html.replace(
      /(<script\s+src="\.\/vendor\/vue\.global\.prod\.js")(\s*>)/gi,
      '$1 onerror="document.querySelectorAll(\'[v-cloak]\').forEach(function(el){el.removeAttribute(\'v-cloak\')})" $2'
    );
    fs.writeFileSync(file, html);
  }
}

function writeDeployReadme() {
  const text = `GitHub Pages deploy package
===========================

Upload the CONTENTS of this folder to your repository ROOT (not the folder itself).

Required at repo root after upload:
  index.html
  login.html
  vendor/vue.global.prod.js
  js/
  css/
  assets/
  .nojekyll
  ...and the other files listed by npm run build

Enable Pages: Settings → Pages → Deploy from branch → / (root)

Open:
  https://<username>.github.io/<repository-name>/
  https://<username>.github.io/<repository-name>/login.html

Do NOT open:
  https://<username>.github.io/<repository-name>/github-pages-build/
`;
  fs.writeFileSync(path.join(OUT, 'DEPLOY.txt'), text);
}

function verify() {
  const htmlFiles = fs
    .readdirSync(OUT)
    .filter((n) => n.endsWith('.html'))
    .map((n) => path.join(OUT, n));

  const missing = [];
  const ok = [];
  for (const html of htmlFiles) {
    for (const ref of collectHtmlRefs(html)) {
      const abs = resolveRef(html, ref);
      const rel = path.relative(OUT, abs).replace(/\\/g, '/');
      if (!fs.existsSync(abs)) missing.push({ html: path.basename(html), ref: rel });
      else ok.push(rel);
    }
  }

  const runtimeFetches = [
    'js/preview-sample-foreign.json',
    'js/crawl-status.json',
    'js/skill-config-default.json',
    'js/gh-pages-base.js',
    'vendor/vue.global.prod.js',
  ];
  for (const f of runtimeFetches) {
    if (!fs.existsSync(path.join(OUT, f))) missing.push({ html: '(required)', ref: f });
    else ok.push(f);
  }

  return { missing, okCount: new Set(ok).size };
}

function main() {
  const tutorialDir = path.join(ROOT, 'static', 'tutorials');
  ensureDir(tutorialDir);
  const keep = path.join(tutorialDir, '.gitkeep');
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');

  rmrf(OUT);
  ensureDir(OUT);

  for (const file of ROOT_FILES) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) throw new Error(`Missing required file: ${file}`);
    copyFile(src, path.join(OUT, file));
  }

  for (const { name, filter } of DIRS) {
    copyDirFiltered(path.join(ROOT, name), path.join(OUT, name), filter);
  }

  writeGhPagesBase();
  patchHtmlForPages();
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  writeDeployReadme();

  const { missing, okCount } = verify();
  if (missing.length) {
    console.error('Build verification FAILED. Missing resources:');
    for (const m of missing) console.error(`  ${m.html} -> ${m.ref}`);
    process.exit(1);
  }

  const list = [];
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else list.push(rel.replace(/\\/g, '/'));
    }
  }
  walk(OUT);
  list.sort();

  console.log('Build OK: github-pages-build/');
  console.log(`Files: ${list.length}`);
  console.log(`Verified unique HTML/JSON refs: ${okCount}`);
  for (const f of list) console.log(`  ${f}`);
}

main();
