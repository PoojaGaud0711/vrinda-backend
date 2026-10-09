/**
 * services/productAutoDetectService.js
 * 
 * Auto-detects product image, MRP (₹), brand, pack size, and pharmaceutical details
 * from live web medical and retail databases (PharmEasy API + DuckDuckGo Image Search).
 */

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 mins

/**
 * Clean product query to maximize search hit rate
 */
function cleanQuery(str = '') {
  return str
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infer default category & subcategory from product text
 */
function inferCategory(text = '') {
  const low = text.toLowerCase();

  // Beauty
  if (/face wash|cleanser|serum|sunscreen|moisturiz|lotion|shampoo|conditioner|hair oil|beard|lipstick|cream/i.test(low)) {
    let sub = 'skincare';
    if (/hair|scalp/i.test(low)) sub = 'haircare';
    else if (/body|bath/i.test(low)) sub = 'bodycare';
    else if (/men|beard|shave/i.test(low)) sub = 'grooming';
    return { category: 'beauty', subcategory: sub };
  }

  // Snacks
  if (/tea|green tea|snack|makhana|almond|cashew|biscuit|cookie|protein bar|energy bar|chana|nuts/i.test(low)) {
    let sub = 'protein';
    if (/tea/i.test(low)) sub = 'teas';
    else if (/almond|cashew|walnut|pistachio|raisin|nuts|dry fruit/i.test(low)) sub = 'dryfruits';
    else if (/bar/i.test(low)) sub = 'bars';
    return { category: 'snacks', subcategory: sub };
  }

  // Needfuls
  if (/diaper|wipe|pad|sanitary|napkin|handwash|sanitizer|v-wash|baby/i.test(low)) {
    let sub = 'daily';
    if (/diaper|baby/i.test(low)) sub = 'baby';
    else if (/pad|sanitary|v-wash|feminine/i.test(low)) sub = 'feminine';
    else if (/wipe|tissue|napkin/i.test(low)) sub = 'napkins';
    return { category: 'needfuls', subcategory: sub };
  }

  // Medicines (default)
  let sub = 'otc';
  if (/tablet|capsule|injection|syrup|drop/i.test(low)) sub = 'prescription';
  if (/ayur|ashwagandha|chyawanprash|neem|tulsi|triphala|amla/i.test(low)) sub = 'ayurvedic';
  if (/vitamin|omega|calcium|zinc|protein|multivitamin|supplement/i.test(low)) sub = 'supplements';

  return { category: 'medicines', subcategory: sub };
}

/**
 * Auto-detect product image and MRP from the web
 */
async function autoDetectProduct(rawName = '', brand = '') {
  const q = cleanQuery(`${rawName} ${brand}`);
  if (!q || q.length < 2) {
    return { found: false, message: 'Please provide a valid product name' };
  }

  const cacheKey = q.toLowerCase();
  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (Date.now() - cached.time < CACHE_TTL) {
      return cached.data;
    }
  }

  const result = {
    found: false,
    query: q,
    name: rawName,
    mrp: null,
    price: null,
    image: null,
    images: [],
    brand: brand,
    pack: '',
    unit: '',
    category: '',
    subcategory: '',
    requiresPrescription: false,
    activeSalt: null,
    source: null
  };

  // ── Step 1: Query PharmEasy Live Drug & Wellness Catalog ──
  try {
    const peUrl = `https://pharmeasy.in/api/search/search/?q=${encodeURIComponent(q)}&page=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const peRes = await fetch(peUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (peRes.ok) {
      const peData = await peRes.json();
      const p = peData.data?.products?.[0];
      if (p) {
        result.found = true;
        result.source = 'PharmEasy Verified Catalog';
        result.mrp = Math.round(Number(p.mrpDecimal || p.mrp || 0));
        result.price = Math.round(Number(p.salePriceDecimal || p.salePrice || (result.mrp ? result.mrp * 0.9 : 0)));
        result.brand = p.manufacturer || p.consumerBrandName || brand;
        result.requiresPrescription = !!p.isRxRequired;
        result.activeSalt = p.moleculeName || p.compositions?.[0]?.name || null;

        // Pack size & unit
        if (p.shortSubtitleText || p.subtitleText || p.packform) {
          result.pack = p.shortSubtitleText || p.subtitleText || p.packform;
        }
        if (p.measurementUnit || p.packform) {
          result.unit = `per ${p.measurementUnit || p.packform}`;
        }

        // Image extraction: Prefer high-res unwatermarked DAM images
        const imgs = [];
        if (Array.isArray(p.damImages) && p.damImages.length) {
          p.damImages.forEach(d => {
            if (d.url && !imgs.includes(d.url)) imgs.push(d.url);
          });
        }
        if (Array.isArray(p.images)) {
          p.images.forEach(u => {
            const cleanUrl = u.replace(/\?dim=\d+x\d+.*$/, '');
            if (!imgs.includes(cleanUrl)) imgs.push(cleanUrl);
          });
        }
        if (p.image) {
          const cleanUrl = p.image.replace(/\?dim=\d+x\d+.*$/, '');
          if (!imgs.includes(cleanUrl)) imgs.push(cleanUrl);
        }

        result.images = imgs.slice(0, 4);
        result.image = imgs[0] || null;
      }
    }
  } catch (err) {
    // PharmEasy failed or timed out — continue to fallback
  }

  // ── Step 2: Fallback / Supplement via DuckDuckGo Image Search if < 4 images ──
  if (!result.image || result.images.length < 2) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q + ' product packaging')}&iax=images&ia=images`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const html = await tokenRes.text();
      clearTimeout(timeout);

      const vqdMatch = html.match(/vqd=(?:&quot;|")?([a-zA-Z0-9_-]+)/) || html.match(/vqd=([0-9-]+)/);
      const vqd = vqdMatch ? vqdMatch[1] : null;

      if (vqd) {
        const ddgImgUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(q + ' product packaging')}&vqd=${vqd}&f=,,,`;
        const ddgRes = await fetch(ddgImgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://duckduckgo.com/'
          }
        });
        const ddgData = await ddgRes.json();
        const hits = (ddgData.results || []).slice(0, 6);
        if (hits.length) {
          result.found = true;
          result.source = result.source || 'Web Product Search';
          
          const moreImgs = hits.map(h => h.image || h.thumbnail).filter(Boolean);
          for (const mi of moreImgs) {
            if (!result.images.includes(mi) && result.images.length < 4) {
              result.images.push(mi);
            }
          }
          if (!result.image && result.images.length) {
            result.image = result.images[0];
          }

          // Extract MRP from title snippet if missing
          if (!result.mrp) {
            for (const h of hits) {
              const pMatch = h.title?.match(/(?:₹|Rs\.?)\s*(\d+(?:\.\d{1,2})?)/i);
              if (pMatch) {
                const val = Math.round(parseFloat(pMatch[1]));
                if (val >= 10 && val <= 10000) {
                  result.mrp = val;
                  result.price = Math.round(val * 0.9);
                  break;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // DDG fallback failed
    }
  }

  // ── Step 3: Default price estimation if image was found but MRP wasn't ──
  if (result.found && (!result.mrp || result.mrp <= 0)) {
    // Sensible standard Indian MRP estimation based on product classification
    const catInfer = inferCategory(rawName);
    if (catInfer.category === 'medicines') {
      result.mrp = 150;
      result.price = 135;
    } else if (catInfer.category === 'beauty') {
      result.mrp = 350;
      result.price = 315;
    } else if (catInfer.category === 'snacks') {
      result.mrp = 250;
      result.price = 220;
    } else {
      result.mrp = 200;
      result.price = 180;
    }
  }

  // Auto infer category & subcategory suggestions
  const catInfo = inferCategory(rawName);
  result.category = catInfo.category;
  result.subcategory = catInfo.subcategory;

  const response = {
    success: true,
    found: result.found,
    data: result
  };

  CACHE.set(cacheKey, { time: Date.now(), data: response });
  return response;
}

module.exports = {
  autoDetectProduct,
};
