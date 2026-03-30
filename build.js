// build.js
// Runs automatically via GitHub Actions whenever content/journal.json changes.
// Reads every published post and writes a real HTML file to /posts/slug.html
// Also rewrites the journal grid section in index.html with hardcoded cards.

const fs   = require('fs');
const path = require('path');

// ── LOAD DATA ──────────────────────────────────────────────────────────────
const raw      = fs.readFileSync('content/journal.json', 'utf8');
const data     = JSON.parse(raw);
const allPosts = data.posts || [];
const published = allPosts
  .filter(p => p.status === 'published')
  .sort((a, b) => new Date(b.date) - new Date(a.date));

console.log(`Found ${published.length} published post(s).`);

// ── ENSURE OUTPUT DIR ──────────────────────────────────────────────────────
if (!fs.existsSync('posts')) fs.mkdirSync('posts');

// ── HELPERS ────────────────────────────────────────────────────────────────
function fmtDate(d, long = false) {
  if (!d) return '';
  const date = new Date(d);
  if (long) return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function escape(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── POST PAGE TEMPLATE ─────────────────────────────────────────────────────
function buildPostPage(post, prev, next) {
  const title    = escape(post.title || '');
  const excerpt  = escape(post.excerpt || '');
  const category = escape(post.category || 'Journal');
  const tags     = (post.tags || []).map(t => `<span class="tag">${escape(t)}</span>`).join('');
  const imgSrc   = post.featuredImage ? `../${post.featuredImage}` : '';
  const imgHtml  = imgSrc
    ? `<img src="${imgSrc}" alt="${title}" />`
    : `<div class="no-image">AV</div>`;
  const metaDesc = escape(post.metaDescription || post.excerpt || '');
  const readTime = post.readTime ? `<div><dt>Read time</dt><dd>${post.readTime} min</dd></div>` : '';
  const tagsBlock = tags ? `<div class="post-tags"><span class="post-tags-label">Tags</span>${tags}</div>` : '';
  const prevLink = prev
    ? `<a class="post-nav-item" href="${prev.slug}.html"><div class="post-nav-dir">← Previous</div><div class="post-nav-title">${escape(prev.title)}</div></a>`
    : `<div></div>`;
  const nextLink = next
    ? `<a class="post-nav-item" href="${next.slug}.html" style="text-align:right"><div class="post-nav-dir">Next →</div><div class="post-nav-title">${escape(next.title)}</div></a>`
    : `<div></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Anna Voss</title>
  <meta name="description" content="${metaDesc}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${metaDesc}" />
  ${imgSrc ? `<meta property="og:image" content="${imgSrc}" />` : ''}
  <meta property="og:type" content="article" />
  <link rel="canonical" href="https://annavoss.ch/posts/${escape(post.slug)}.html" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--black:#0a0a0a;--white:#f5f4f0;--gray:#9a9a9a;--light-gray:#e8e7e3;--font-display:'Bebas Neue',sans-serif;--font-body:'Helvetica Neue',Helvetica,Arial,sans-serif}
    html{scroll-behavior:smooth}
    body{background:var(--white);color:var(--black);font-family:var(--font-body);font-size:14px;line-height:1.7;cursor:crosshair}
    .cursor{width:8px;height:8px;background:var(--black);border-radius:50%;position:fixed;top:0;left:0;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .2s,height .2s}
    .cursor.expanded{width:40px;height:40px;background:transparent;border:1px solid var(--black)}
    nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:flex-end;padding:28px 40px 20px;background:var(--white);border-bottom:1px solid var(--black)}
    .nav-logo{font-family:var(--font-display);font-size:26px;letter-spacing:.08em;text-decoration:none;color:var(--black);line-height:1}
    .nav-back{font-size:11px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;color:var(--gray);transition:color .2s}
    .nav-back:hover{color:var(--black)}
    .nav-back::before{content:'← '}
    .post-header{margin-top:73px;display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--black);min-height:60vh}
    .post-header-left{padding:60px 50px;display:flex;flex-direction:column;justify-content:space-between;border-right:1px solid var(--black)}
    .post-meta-top{display:flex;gap:20px;align-items:center;margin-bottom:32px}
    .post-category{font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:var(--gray)}
    .post-dot{width:6px;height:6px;border-radius:50%;background:var(--black);display:inline-block}
    .post-date-label{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--gray)}
    .post-title{font-family:var(--font-display);font-size:clamp(40px,5vw,72px);line-height:.95;letter-spacing:.03em;margin-bottom:32px}
    .post-excerpt{font-size:14px;line-height:1.75;color:#4a4a4a;max-width:480px}
    .post-meta-bottom{border-top:1px solid var(--black);padding-top:24px;display:flex;gap:40px}
    .post-meta-bottom dt{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gray);margin-bottom:4px}
    .post-meta-bottom dd{font-size:12px}
    .post-header-right{overflow:hidden;position:relative}
    .post-header-right img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(100%)}
    .no-image{width:100%;height:100%;background:var(--light-gray);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:80px;color:#ddd;min-height:400px}
    .post-tags{padding:20px 50px;border-bottom:1px solid var(--black);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .post-tags-label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gray);margin-right:6px}
    .tag{font-size:10px;letter-spacing:.14em;text-transform:uppercase;border:1px solid var(--light-gray);padding:4px 12px;color:var(--gray)}
    .post-body{display:grid;grid-template-columns:1fr 2fr;border-bottom:1px solid var(--black)}
    .post-sidebar{border-right:1px solid var(--black);padding:60px 40px}
    .sidebar-section{margin-bottom:40px}
    .sidebar-label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gray);margin-bottom:12px;display:block}
    .sidebar-value{font-size:13px;line-height:1.5}
    .post-content{padding:60px 60px 80px;max-width:760px}
    .post-content p{margin-bottom:24px;font-size:15px;line-height:1.85;color:#2a2a2a}
    .post-content h2{font-family:var(--font-display);font-size:32px;letter-spacing:.05em;margin:40px 0 16px}
    .post-content h3{font-family:var(--font-display);font-size:22px;letter-spacing:.05em;margin:32px 0 12px}
    .post-content blockquote{border-left:3px solid var(--black);margin:32px 0;padding:12px 0 12px 24px;font-size:16px;line-height:1.7;color:#4a4a4a;font-style:italic}
    .post-content img{width:100%;display:block;filter:grayscale(100%);margin:32px 0}
    .post-content a{color:var(--black);border-bottom:1px solid var(--light-gray);text-decoration:none;transition:border-color .2s}
    .post-content a:hover{border-color:var(--black)}
    .post-nav{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--black)}
    .post-nav-item{padding:32px 40px;text-decoration:none;color:var(--black);transition:background .15s;display:block}
    .post-nav-item:first-child{border-right:1px solid var(--black)}
    .post-nav-item:hover{background:var(--light-gray)}
    .post-nav-dir{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gray);margin-bottom:8px}
    .post-nav-title{font-family:var(--font-display);font-size:20px;letter-spacing:.04em}
    footer{display:flex;justify-content:space-between;align-items:center;padding:20px 40px}
    .footer-logo{font-family:var(--font-display);font-size:18px;letter-spacing:.08em}
    .footer-copy{font-size:10px;color:var(--gray);letter-spacing:.1em}
    .footer-links{display:flex;gap:24px;list-style:none}
    .footer-links a{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gray);text-decoration:none}
    .footer-links a:hover{color:var(--black)}
    @media(max-width:900px){
      nav{padding:20px}
      .post-header{grid-template-columns:1fr}
      .post-header-left{padding:40px 20px;border-right:none;border-bottom:1px solid var(--black)}
      .post-header-right{height:50vw}
      .post-body{grid-template-columns:1fr}
      .post-sidebar{border-right:none;border-bottom:1px solid var(--black);padding:32px 20px}
      .post-content{padding:40px 20px 60px}
      .post-tags{padding:16px 20px}
      .post-nav{grid-template-columns:1fr}
      .post-nav-item:first-child{border-right:none;border-bottom:1px solid var(--black)}
      footer{flex-wrap:wrap;gap:12px;padding:20px}
    }
  </style>
</head>
<body>
  <div class="cursor" id="cursor"></div>

  <nav>
    <a href="../index.html" class="nav-logo">ANNA VOSS</a>
    <a href="../index.html#blog" class="nav-back">Journal</a>
  </nav>

  <div class="post-header">
    <div class="post-header-left">
      <div>
        <div class="post-meta-top">
          <span class="post-category">${category}</span>
          <span class="post-dot"></span>
          <span class="post-date-label">${fmtDate(post.date, true)}</span>
        </div>
        <h1 class="post-title">${title}</h1>
        ${post.excerpt ? `<p class="post-excerpt">${excerpt}</p>` : ''}
      </div>
      <dl class="post-meta-bottom">
        <div><dt>Category</dt><dd>${category}</dd></div>
        <div><dt>Published</dt><dd>${fmtDate(post.date)}</dd></div>
        ${readTime}
      </dl>
    </div>
    <div class="post-header-right">${imgHtml}</div>
  </div>

  ${tagsBlock}

  <div class="post-body">
    <div class="post-sidebar">
      <div class="sidebar-section">
        <span class="sidebar-label">Published</span>
        <div class="sidebar-value">${fmtDate(post.date, true)}</div>
      </div>
      <div class="sidebar-section">
        <span class="sidebar-label">Category</span>
        <div class="sidebar-value">${category}</div>
      </div>
      ${(post.tags||[]).length ? `<div class="sidebar-section"><span class="sidebar-label">Tags</span><div class="sidebar-value">${(post.tags||[]).map(escape).join(', ')}</div></div>` : ''}
    </div>
    <div class="post-content">
      ${post.body || '<p>No content.</p>'}
    </div>
  </div>

  <div class="post-nav">
    ${prevLink}
    ${nextLink}
  </div>

  <footer>
    <span class="footer-logo">ANNA VOSS</span>
    <span class="footer-copy">© ${new Date().getFullYear()} Anna Voss. All rights reserved.</span>
    <ul class="footer-links">
      <li><a href="#">Instagram</a></li>
      <li><a href="#">Prints</a></li>
      <li><a href="#">Press</a></li>
    </ul>
  </footer>

  <script>
    const c = document.getElementById('cursor');
    document.addEventListener('mousemove', e => { c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px'; });
    document.querySelectorAll('a').forEach(el => {
      el.addEventListener('mouseenter', () => c.classList.add('expanded'));
      el.addEventListener('mouseleave', () => c.classList.remove('expanded'));
    });
  </script>
</body>
</html>`;
}

// ── BUILD EACH POST ────────────────────────────────────────────────────────
published.forEach((post, i) => {
  const prev = published[i + 1] || null;
  const next = published[i - 1] || null;
  const html = buildPostPage(post, prev, next);
  const outPath = path.join('posts', `${post.slug}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`  ✓ posts/${post.slug}.html`);
});

// ── REWRITE JOURNAL GRID IN INDEX.HTML ────────────────────────────────────
// Replaces everything between the CMS markers in index.html with
// hardcoded post cards so the homepage journal grid is also SEO-friendly.

const shown = published.slice(0, 3);

const cards = shown.map((p, i) => {
  const imgSrc = p.featuredImage ? p.featuredImage : 'images/hero.png';
  return `
      <a class="blog-item" href="posts/${p.slug}.html">
        <div class="blog-item-image">
          <img src="${imgSrc}" alt="${escape(p.title)}" />
        </div>
        <div class="blog-item-body">
          <span class="blog-item-tag">${escape(p.category || 'Journal')}</span>
          <h3 class="blog-item-title">${escape(p.title)}</h3>
          <p class="blog-item-excerpt">${escape(p.excerpt || '')}</p>
        </div>
        <div class="blog-item-footer">
          <span class="blog-date">${fmtDate(p.date)}</span>
          <span class="blog-read">Read</span>
        </div>
      </a>`;
}).join('');

const emptyState = `\n      <div class="blog-empty">Journal coming soon.</div>`;
const gridContent = shown.length ? cards : emptyState;

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Replace between markers
const START = '<!-- CMS:JOURNAL:START -->';
const END   = '<!-- CMS:JOURNAL:END -->';

if (indexHtml.includes(START) && indexHtml.includes(END)) {
  const before = indexHtml.indexOf(START) + START.length;
  const after  = indexHtml.indexOf(END);
  indexHtml = indexHtml.slice(0, before) + gridContent + '\n    ' + indexHtml.slice(after);
  fs.writeFileSync('index.html', indexHtml, 'utf8');
  console.log('  ✓ index.html journal grid updated');
} else {
  console.warn('  ⚠ CMS markers not found in index.html — skipping grid update');
}

console.log(`\nBuild complete. ${published.length} post(s) written to /posts/`);
