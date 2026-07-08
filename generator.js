const fs = require('fs');
const path = require('path');

// ─── CONFIG ───
const APP_NAME = 'GitPocket'; // Change to your app name
const BASE_URL = 'https://gitpocket.com'; // Change to your domain
const OUTPUT_DIR = path.join(__dirname, 'output');

// ─── LOAD DATA ───
const data = JSON.parse(fs.readFileSync('data/keywords.json', 'utf-8'));
const template = fs.readFileSync('templates/page.html', 'utf-8');

// ─── UTILS ───
function slugify(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── GENERATE ALL COMBINATIONS ───
const pages = [];

for (const device of data.devices) {
    for (const platform of data.platforms) {
        for (const action of data.actions) {
            for (const context of data.contexts) {

                const title = `How to ${action} ${platform} from ${device} ${context}`;
                const slug = slugify(`how-to-${action}-${platform}-from-${device}-${context}`);
                const url = `${BASE_URL}/${slug}`;
                const metaDesc = `Learn how to ${action} ${platform} directly from your ${device} ${context}. No laptop, no terminal. Unzip and push in 30 seconds with ${APP_NAME}.`;
                const painPoint = pick(data.pain_points);

                // ─── Build FAQ HTML + Schema ───
                let faqHtml = '';
                const faqSchemaItems = [];

                for (const faq of data.faq_pairs) {
                    const q = faq.q
                        .replace('{platform}', platform)
                        .replace('{device}', device);
                    const a = faq.a
                        .replace(/{AppName}/g, APP_NAME)
                        .replace(/{platform}/g, platform)
                        .replace(/{device}/g, device);

                    faqHtml += `
                        <div class="faq-item">
                            <h3>${q}</h3>
                            <p>${a}</p>
                        </div>`;

                    faqSchemaItems.push({
                        "@type": "Question",
                        "name": q,
                        "acceptedAnswer": { "@type": "Answer", "text": a }
                    });
                }

                const faqSchema = JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": faqSchemaItems
                }, null, 2);

                // ─── Internal Links (link to 5 random sibling pages) ───
                const siblingSlugs = [];
                for (let i = 0; i < 5; i++) {
                    const rd = pick(data.devices);
                    const rp = pick(data.platforms);
                    const ra = pick(data.actions);
                    const rc = pick(data.contexts);
                    const rs = slugify(`how-to-${ra}-${rp}-from-${rd}-${rc}`);
                    siblingSlugs.push(`<a href="/${rs}">How to ${ra} ${rp} from ${rd} ${rc}</a>`);
                }

                // ─── RENDER PAGE ───
                let html = template
                    .replace(/\{\{TITLE\}\}/g, title)
                    .replace(/\{\{META_DESC\}\}/g, metaDesc)
                    .replace(/\{\{CANONICAL_URL\}\}/g, url)
                    .replace(/\{\{DEVICE\}\}/g, device)
                    .replace(/\{\{PLATFORM\}\}/g, platform)
                    .replace(/\{\{ACTION\}\}/g, action)
                    .replace(/\{\{CONTEXT\}\}/g, context)
                    .replace(/\{\{APP_NAME\}\}/g, APP_NAME)
                    .replace(/\{\{PAIN_POINT\}\}/g, painPoint)
                    .replace(/\{\{FAQ_SCHEMA\}\}/g, faqSchema)
                    .replace(/\{\{FAQ_HTML\}\}/g, faqHtml)
                    .replace(/\{\{INTERNAL_LINKS\}\}/g, siblingSlugs.join('\n        '));

                pages.push({ slug, url, html });
            }
        }
    }
}

// ─── WRITE FILES ───
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const page of pages) {
    fs.writeFileSync(path.join(OUTPUT_DIR, `${page.slug}.html`), page.html);
}

// ─── GENERATE SITEMAP ───
const sitemapUrls = pages.map(p => `
  <url>
    <loc>${p.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap);

// ─── REPORT ───
console.log(`\n✅ Generated ${pages.length} unique landing pages.`);
console.log(`📄 Sitemap: output/sitemap.xml`);
console.log(`📁 Output:  output/\n`);

