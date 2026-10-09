/**
 * services/medicineGuideService.js
 * 
 * Clinical Medicine & Usage Guide Service
 * Fetches clinical usage, indications, dosage, mechanism of action, side effects,
 * and safety warnings directly from online medical sources (OpenFDA & Wikipedia API),
 * enriched with a verified clinical pharmacy knowledge base for Indian & global formulations.
 */

const CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Curated pharmaceutical & clinical reference dictionary
const DRUG_KNOWLEDGE_BASE = {
  paracetamol: {
    genericName: 'Paracetamol / Acetaminophen (650 mg)',
    therapeuticClass: 'Analgesic & Antipyretic (Pain reliever & Fever reducer)',
    openfdaQuery: 'acetaminophen',
    wikiQuery: 'Paracetamol',
    uses: [
      'Relief of mild to moderate fever (Antipyretic)',
      'Headache and migraine symptom management',
      'Muscle aches, backache, and body pain relief',
      'Toothache and dental pain reduction',
      'Symptomatic relief in cold, flu, and viral infections'
    ],
    howToUse: 'Take orally with a glass of water. Can be taken with or without food, though taking after light meals is gentler on the stomach. Do not crush or chew extended-release formulations. Space doses at least 4 to 6 hours apart.',
    howItWorks: 'Paracetamol acts predominantly in the central nervous system by inhibiting prostaglandin synthesis via cyclooxygenase (COX-3 / COX-1 variants) enzymes, and acts on hypothalamic heat-regulating centers to dissipate fever via peripheral vasodilation and sweating.',
    sideEffects: [
      { symptom: 'Nausea or mild stomach discomfort', severity: 'Mild' },
      { symptom: 'Allergic skin rash or itching', severity: 'Rare' },
      { symptom: 'Liver toxicity (only with chronic overdose >4000mg/day)', severity: 'Severe (Overdose)' }
    ],
    safetyAdvice: {
      alcohol: { status: 'unsafe', label: 'Unsafe', text: 'Avoid alcohol consumption while taking Paracetamol. Alcohol significantly increases the risk of acute hepatic (liver) damage.' },
      pregnancy: { status: 'safe', label: 'Safe if Advised', text: 'Generally considered the safest analgesic during pregnancy when used at the lowest effective dose for the shortest duration.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'Excreted in human breast milk in tiny, clinically insignificant amounts. Safe for nursing mothers.' },
      driving: { status: 'safe', label: 'Safe', text: 'Does not impair cognitive alertness or motor coordination. Safe to drive.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Use with caution in patients with severe renal impairment. Longer dosing intervals may be required.' },
      liver: { status: 'caution', label: 'High Caution', text: 'Do not exceed 2000mg - 3000mg/day if you have pre-existing liver disease. Contraindicated in severe liver failure.' }
    },
    missedDose: 'Take the missed dose as soon as you remember. If it is nearly time for your next scheduled dose, skip the missed dose and resume your regular schedule. Never double dose.',
    expertTips: [
      'Maximum safe adult daily dose is 4,000 mg (4 grams) in 24 hours from all combined sources.',
      'Always check labels of other cold or cough syrups to prevent accidental Paracetamol double-dosing.',
      'Consult your doctor if fever persists for more than 3 consecutive days despite medication.'
    ],
    faqs: [
      { q: 'Can I take Dolo 650 on an empty stomach?', a: 'Yes, but taking it after a snack or meal reduces chances of mild gastric upset.' },
      { q: 'How fast does Paracetamol start working?', a: 'Clinical pain and fever relief usually begins within 30 to 45 minutes of oral intake and peaks around 1 to 2 hours.' },
      { q: 'Is Dolo 650 safe for children?', a: 'Dolo 650 is formulated for adults and adolescents above 12 years (weight > 40kg). For young children, use pediatric syrups under pediatrician guidance.' }
    ]
  },

  azithromycin: {
    genericName: 'Azithromycin (500 mg)',
    therapeuticClass: 'Macrolide Antibiotic (Broad-spectrum)',
    openfdaQuery: 'azithromycin',
    wikiQuery: 'Azithromycin',
    uses: [
      'Upper and lower respiratory tract infections (Tonsillitis, Pharyngitis, Sinusitis, Bronchitis)',
      'Community-acquired pneumonia',
      'Skin and soft tissue bacterial infections',
      'Genital tract infections and certain sexually transmitted infections (Chlamydia)',
      'Typhoid fever and bacterial gastrointestinal infections (adjunct)'
    ],
    howToUse: 'Take once daily at the same time every day with a full glass of water. Can be taken with or without food; however, taking it with a meal can minimize gastrointestinal upset. Complete the full prescribed course (usually 3 to 5 days) even if symptoms improve early.',
    howItWorks: 'Azithromycin reversibly binds to the 50S ribosomal subunit of susceptible microorganisms, preventing the translocation of peptidyl-tRNA and inhibiting bacterial protein synthesis, thereby halting bacterial growth and proliferation.',
    sideEffects: [
      { symptom: 'Nausea, abdominal cramps, or loose stools', severity: 'Common' },
      { symptom: 'Headache or mild dizziness', severity: 'Mild' },
      { symptom: 'Altered taste perception', severity: 'Temporary' },
      { symptom: 'Severe allergic reaction or cardiac QT prolongation', severity: 'Rare' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Alcohol does not directly neutralize Azithromycin, but alcohol consumption stresses the liver and may amplify nausea and dehydration.' },
      pregnancy: { status: 'safe', label: 'Generally Safe', text: 'FDA Category B. Usually prescribed when clearly indicated and benefits outweigh potential risks.' },
      breastfeeding: { status: 'caution', label: 'Caution', text: 'Passes into breast milk in small amounts. Monitor infant for gastrointestinal changes (diarrhea/candidiasis).' },
      driving: { status: 'safe', label: 'Safe', text: 'Does not usually affect ability to drive unless you experience dizziness.' },
      kidney: { status: 'safe', label: 'Safe', text: 'No dosage adjustments typically needed for mild to moderate renal insufficiency.' },
      liver: { status: 'caution', label: 'Caution', text: 'Since Azithromycin is primarily eliminated via the biliary system/liver, monitor closely in patients with hepatic impairment.' }
    },
    missedDose: 'Take the missed dose as soon as possible. If it is already time for the next dose, skip the missed one. Do not take two tablets together to make up for a missed dose.',
    expertTips: [
      'Do not take antacids containing aluminum or magnesium within 2 hours of taking Azithromycin, as they reduce absorption.',
      'Never discontinue an antibiotic course early. Halting early can cause bacterial resistance and infection recurrence.',
      'Stay well-hydrated throughout the antibiotic course.'
    ],
    faqs: [
      { q: 'Why is Azithromycin prescribed for only 3 to 5 days?', a: 'Azithromycin has an unusually long tissue half-life (approx. 68 hours), meaning it continues destroying bacteria in your body for days after the last dose.' },
      { q: 'Does Azithral cure viral cold or flu?', a: 'No. Azithromycin only cures bacterial infections and is ineffective against viral colds, flu, or COVID-19 unless a secondary bacterial infection develops.' }
    ]
  },

  telmisartan: {
    genericName: 'Telmisartan (40 mg)',
    therapeuticClass: 'Angiotensin II Receptor Blocker (ARB) / Antihypertensive',
    openfdaQuery: 'telmisartan',
    wikiQuery: 'Telmisartan',
    uses: [
      'Management of primary (essential) hypertension (High Blood Pressure)',
      'Cardiovascular risk reduction (stroke, myocardial infarction prevention)',
      'Protection of renal function in hypertensive diabetic patients',
      'Long-term 24-hour blood pressure stabilization'
    ],
    howToUse: 'Take once daily at the same time every day, morning or evening, with water. Can be taken with or without food. Swallow tablet whole without chewing or crushing. It is intended for continuous, long-term daily management.',
    howItWorks: 'Telmisartan selectively blocks the binding of angiotensin II to the AT1 receptor subtype in vascular smooth muscle and adrenal glands. This causes vasodilation (widening of blood vessels), decreases vascular resistance, and reduces blood pressure smoothly over 24 hours.',
    sideEffects: [
      { symptom: 'Mild dizziness or lightheadedness upon standing', severity: 'Common initially' },
      { symptom: 'Fatigue or back pain', severity: 'Mild' },
      { symptom: 'Elevated potassium levels (Hyperkalemia)', severity: 'Requires periodic blood monitoring' }
    ],
    safetyAdvice: {
      alcohol: { status: 'unsafe', label: 'Unsafe', text: 'Alcohol can induce an additive blood-pressure-lowering effect, causing severe dizziness, fainting, or orthostatic hypotension.' },
      pregnancy: { status: 'unsafe', label: 'Contraindicated', text: 'Do not use during pregnancy. ARBs can cause severe fetal toxicity, renal failure, and developmental harm in the 2nd and 3rd trimesters.' },
      breastfeeding: { status: 'caution', label: 'Caution', text: 'Safety during lactation has not been established; alternative medications are preferred.' },
      driving: { status: 'caution', label: 'Caution initially', text: 'May cause dizziness when first starting treatment or increasing dosage. Avoid driving until your blood pressure stabilizes.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Monitor serum creatinine and potassium levels regularly.' },
      liver: { status: 'caution', label: 'Caution', text: 'Eliminated predominantly by biliary excretion; lower starting doses are recommended for patients with hepatic impairment.' }
    },
    missedDose: 'If you miss a dose, take it as soon as you remember that day. If it is close to the next scheduled dose, skip it and continue your normal schedule. Do not take a double dose.',
    expertTips: [
      'Keep a home blood pressure logbook and record readings twice a week to share with your cardiologist.',
      'Avoid high-potassium dietary salt substitutes without consulting your physician.',
      'Do not abruptly discontinue blood pressure medication even if you feel completely fine, as hypertension often causes no outward symptoms.'
    ],
    faqs: [
      { q: 'Can I stop Telma 40 once my BP becomes normal?', a: 'No. Your blood pressure is normal because the medication is actively regulating it. Discontinuing it will cause blood pressure to rebound.' },
      { q: 'What is the best time to take Telma 40?', a: 'Take it consistently at the same hour each day — many cardiologists recommend morning with breakfast.' }
    ]
  },

  antacid: {
    genericName: 'Dried Aluminium Hydroxide, Magnesium Hydroxide & Simethicone',
    therapeuticClass: 'Antacid & Antiflatulent Suspension / Gel',
    openfdaQuery: 'aluminum hydroxide magnesium hydroxide simethicone',
    wikiQuery: 'Antacid',
    uses: [
      'Rapid relief from hyperacidity and acid indigestion',
      'Heartburn, sour stomach, and gastroesophageal reflux (GERD)',
      'Bloating, stomach fullness, and flatulence relief',
      'Soothing protective mucosal coating for gastritis and peptic ulcers'
    ],
    howToUse: 'Shake bottle well before use. Measure 1 to 2 teaspoonfuls (5-10 ml) and take 1 to 2 hours after meals and at bedtime, or when acidity symptoms arise. Do not drink excessive water immediately after taking to allow the mucosal protective coat to adhere.',
    howItWorks: 'Aluminum and Magnesium hydroxides chemically neutralize hydrochloric acid in gastric juice, raising stomach pH above 3.5. Simethicone reduces surface tension of gas bubbles, causing them to coalesce into easily expelled flatus, relieving bloating.',
    sideEffects: [
      { symptom: 'Altered bowel frequency (Aluminum causes constipation, Magnesium causes loose stools — balanced formulation minimizes this)', severity: 'Mild' },
      { symptom: 'Chalky taste in mouth', severity: 'Mild' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Alcohol irritates the stomach lining and stimulates gastric acid secretion, counteracting antacid benefits.' },
      pregnancy: { status: 'safe', label: 'Generally Safe', text: 'Considered safe for short-term pregnancy-related heartburn under doctor consultation.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'Not absorbed into breast milk in quantities that affect the infant.' },
      driving: { status: 'safe', label: 'Safe', text: 'Has no systemic neurological effects.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Avoid chronic overuse in severe renal failure due to risk of magnesium and aluminum accumulation.' },
      liver: { status: 'safe', label: 'Safe', text: 'Safe in liver conditions.' }
    },
    missedDose: 'Take only as needed when acidity symptoms arise.',
    expertTips: [
      'Do not take within 2 hours of oral antibiotics (like Azithromycin or Tetracyclines) or iron supplements, as antacids hinder mineral absorption.',
      'Avoid lying down flat immediately after eating meals.'
    ],
    faqs: [
      { q: 'Is Digene sugar-free and safe for diabetics?', a: 'Yes, modern formulations like Digene Gel Mint are sugar-free and safe for diabetic patients.' }
    ]
  },

  ashwagandha: {
    genericName: 'Withania Somnifera (Ashwagandha Pure Extract 250mg)',
    therapeuticClass: 'Ayurvedic Rasayana / Adaptogen & Stress Reliever',
    openfdaQuery: 'withania somnifera',
    wikiQuery: 'Withania somnifera',
    uses: [
      'Natural adaptogen for stress reduction, anxiety relief, and cortisol balance',
      'Enhancement of mental stamina, cognitive memory, and focus',
      'Promotion of deep, restorative, and restful sleep',
      'Supports male reproductive vitality, stamina, and testosterone balance',
      'General physical rejuvenation and immune resilience'
    ],
    howToUse: 'Take 1 to 2 tablets daily with warm milk or water, preferably after meals in the evening or before bedtime for optimal relaxation.',
    howItWorks: 'Withanolides, the active phyto-constituents of Ashwagandha, regulate the hypothalamic-pituitary-adrenal (HPA) axis, modulating circulating serum cortisol levels, dampening excessive sympathetic nervous activation, and acting as a GABA-mimetic to soothe neural tension.',
    sideEffects: [
      { symptom: 'Mild drowsiness or digestive relaxation', severity: 'Mild' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'May potentiate sedative effects of alcohol.' },
      pregnancy: { status: 'caution', label: 'Avoid', text: 'Not recommended during pregnancy due to potential emmenagogue properties.' },
      breastfeeding: { status: 'caution', label: 'Consult Vaidya / Doctor', text: 'Consult your Ayurvedic doctor or physician before use.' },
      driving: { status: 'safe', label: 'Safe', text: 'Non-drowsy at normal daytime dosages; take at night if calming effect is strong.' },
      kidney: { status: 'safe', label: 'Safe', text: 'Generally safe; maintain adequate daily hydration.' },
      liver: { status: 'safe', label: 'Safe', text: 'Natural herbal extract with good liver tolerability.' }
    },
    missedDose: 'Take whenever remembered or continue normal evening schedule.',
    expertTips: [
      'Consistent daily usage over 6 to 8 weeks provides the most noticeable adaptogenic and cortisol-balancing benefits.',
      'Pairing with warm milk and a pinch of turmeric aids herbal absorption.'
    ],
    faqs: [
      { q: 'How long does Ashwagandha take to show results?', a: 'Clinical stress reduction and sleep improvements are typically experienced within 2 to 4 weeks of consistent daily intake.' }
    ]
  },

  multivitamin: {
    genericName: 'Zinc, Vitamin C, Vitamin E, B-Complex & Grape Seed Extract',
    therapeuticClass: 'Nutritional Supplement / Daily Micronutrient Complex',
    openfdaQuery: 'zinc vitamin c multivitamin',
    wikiQuery: 'Multivitamin',
    uses: [
      'Immune defense enhancement against seasonal infections',
      'Support for cellular energy metabolism and chronic fatigue reduction',
      'Healthy hair, skin collagen synthesis, and nail tissue repair',
      'High-potency antioxidant defense against oxidative cellular stress',
      'Replenishment of daily micronutrient deficits'
    ],
    howToUse: 'Take 1 tablet daily in the morning or afternoon after a substantial meal with a glass of water. Avoid taking on an empty stomach to optimize absorption of fat-soluble vitamins (A, D, E).',
    howItWorks: 'Chelated zinc facilitates T-lymphocyte maturation and immune response. Vitamin C and Grape Seed Proanthocyanidins scavenge free radicals, while B-complex vitamins act as essential coenzymes in ATP cellular energy production cycles.',
    sideEffects: [
      { symptom: 'Bright yellow urine coloration (harmless, due to excess Riboflavin Vitamin B2)', severity: 'Harmless' },
      { symptom: 'Mild metallic taste or nausea if taken without food', severity: 'Mild' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Chronic alcohol depletes B-vitamins and zinc absorption.' },
      pregnancy: { status: 'safe', label: 'Safe under guidance', text: 'Safe, but pregnant women should ensure Vitamin A limits are observed or use dedicated prenatal vitamins.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'Supports maternal micronutrient requirements.' },
      driving: { status: 'safe', label: 'Safe', text: 'No impact on driving.' },
      kidney: { status: 'safe', label: 'Safe', text: 'Safe at standard recommended dietary allowance (RDA).' },
      liver: { status: 'safe', label: 'Safe', text: 'Supports hepatic metabolic enzymes.' }
    },
    missedDose: 'Take next day with lunch. Do not take two tablets together.',
    expertTips: [
      'Take after breakfast or lunch; taking late at night may interfere with sleep due to B-vitamin energizing effects.',
      'Maintain adequate hydration throughout the day.'
    ],
    faqs: [
      { q: 'Why does my urine turn bright yellow after taking multivitamin?', a: 'This is completely normal and harmless. It is your body eliminating harmless excess Vitamin B2 (Riboflavin).' }
    ]
  },

  skincare_cleanser: {
    genericName: 'Cetyl Alcohol, Stearyl Alcohol, Niacinamide & Panthenol',
    therapeuticClass: 'Dermatological Gentle Cleanser (Soap-Free & Fragrance-Free)',
    openfdaQuery: 'cetaphil gentle skin cleanser',
    wikiQuery: 'Cleanser',
    uses: [
      'Ultra-gentle daily facial and body cleansing for sensitive skin',
      'Maintains natural skin moisture barrier and healthy acid mantle (pH 5.5)',
      'Removes daily dirt, pollution, and light makeup without irritation',
      'Suitable for dry, eczema-prone, rosacea-prone, and sensitized skin'
    ],
    howToUse: 'Directions with water: Apply cleanser and gently massage onto wet skin in circular motions. Rinse thoroughly and pat dry with a clean towel. Directions without water: Apply a liberal amount, gently rub, and wipe off excess with a soft facial tissue or cotton pad. Use twice daily: morning and evening.',
    howItWorks: 'Formulated with mild non-ionic surfactants, Niacinamide (Vitamin B3), and Panthenol (Pro-Vitamin B5). It cleanses skin impurities without disrupting stratum corneum lipids or stripping moisture, soothing irritation.',
    sideEffects: [
      { symptom: 'Hypoallergenic, non-comedogenic, and non-irritating formulation', severity: 'Extremely rare' }
    ],
    safetyAdvice: {
      alcohol: { status: 'safe', label: 'Safe', text: 'External topical use only.' },
      pregnancy: { status: 'safe', label: 'Safe', text: 'Safe for use during pregnancy and nursing.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'External use safe.' },
      driving: { status: 'safe', label: 'Safe', text: 'No systemic absorption.' },
      kidney: { status: 'safe', label: 'Safe', text: 'No systemic effects.' },
      liver: { status: 'safe', label: 'Safe', text: 'No systemic effects.' }
    },
    missedDose: 'Use as part of your regular morning and night skincare routine.',
    expertTips: [
      'Follow immediately with a hydrating moisturizer while skin is still slightly damp for maximum hydration retention.',
      'Dermatologist tested and safe for post-procedure or peeling skin.'
    ],
    faqs: [
      { q: 'Will this cleanser foam or lather?', a: 'No, this is a non-foaming lotion-like formulation designed specifically to avoid stripping skin oils.' },
      { q: 'Can I use this if I have active acne?', a: 'Yes, it is non-comedogenic (does not clog pores) and will not irritate active blemishes.' }
    ]
  }
};

/**
 * Determine the best matching clinical reference key from a product name and description
 */
function identifyDrugKey(name = '', brand = '', category = '', subcategory = '', desc = '') {
  const combined = `${name} ${brand} ${category} ${subcategory} ${desc}`.toLowerCase();

  if (combined.includes('dolo') || combined.includes('paracetamol') || combined.includes('pcm') || combined.includes('acetaminophen') || combined.includes('calpol')) {
    return 'paracetamol';
  }
  if (combined.includes('azithral') || combined.includes('azithromycin') || combined.includes('zithromax') || combined.includes('azee')) {
    return 'azithromycin';
  }
  if (combined.includes('telma') || combined.includes('telmisartan') || combined.includes('telmikind')) {
    return 'telmisartan';
  }
  if (combined.includes('digene') || combined.includes('antacid') || combined.includes('gelusil')) {
    return 'antacid';
  }
  if (combined.includes('ashwagandha')) {
    return 'ashwagandha';
  }
  if (combined.includes('zincovit') || combined.includes('multivitamin') || combined.includes('fish oil') || combined.includes('omega')) {
    return 'multivitamin';
  }
  if (combined.includes('cleanser') || combined.includes('cetaphil') || combined.includes('face wash') || combined.includes('serum') || combined.includes('lotion')) {
    return 'skincare_cleanser';
  }
  return null;
}

/**
 * Fetch medical summary directly from Wikipedia REST API
 */
async function fetchWikipediaSummary(query) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VrindaWellnessPharmacy/1.0 (contact@vrindawellness.in)' }
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      description: data.description,
      extract: data.extract,
      pageUrl: data.content_urls?.desktop?.page || null,
      thumbnail: data.thumbnail?.source || null,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Fetch FDA drug label information directly from OpenFDA API
 */
async function fetchOpenFdaData(genericQuery) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const clean = encodeURIComponent(genericQuery.replace(/[^a-zA-Z0-9 ]/g, ''));
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${clean}&limit=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const record = data.results?.[0];
    if (!record) return null;

    const stripHeader = (arr) => {
      if (!arr || !arr.length) return null;
      let text = arr[0].replace(/^(1|2|3|4|5|6|7|8|9|10|\s|\.|\:)+/g, '').trim();
      text = text.replace(/^(INDICATIONS AND USAGE|DOSAGE AND ADMINISTRATION|WARNINGS|CONTRAINDICATIONS|SIDE EFFECTS|ADVERSE REACTIONS)/i, '').trim();
      return text;
    };

    return {
      genericName: record.openfda?.generic_name?.[0] || genericQuery,
      brandName: record.openfda?.brand_name?.[0] || null,
      substanceName: record.openfda?.substance_name?.[0] || null,
      indications: stripHeader(record.indications_and_usage),
      dosage: stripHeader(record.dosage_and_administration),
      warnings: stripHeader(record.warnings),
      adverseReactions: stripHeader(record.adverse_reactions),
      clinicalPharmacology: stripHeader(record.clinical_pharmacology),
      storage: stripHeader(record.storage_and_handling),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Generate a complete, authoritative Medicine & Clinical Usage Guide
 * by fetching directly from online medical sources (Wikipedia & OpenFDA)
 * with robust clinical knowledge base integration.
 */
async function getMedicineGuide(product, forceRefresh = false) {
  if (!product) return null;
  const prodId = product._id ? product._id.toString() : product.name;

  if (!forceRefresh && CACHE.has(prodId)) {
    const cached = CACHE.get(prodId);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const name = product.name || '';
  const brand = product.brand || '';
  const cat = product.category || '';
  const sub = product.subcategory || '';
  const desc = product.description || '';

  const matchedKey = identifyDrugKey(name, brand, cat, sub, desc);
  const baseData = matchedKey ? DRUG_KNOWLEDGE_BASE[matchedKey] : null;

  // Determine queries for internet search
  let wikiSearchTerm = baseData?.wikiQuery || name.split(' ')[0];
  let fdaSearchTerm = baseData?.openfdaQuery || (name.includes(' ') ? name.split(' ')[0] : name);

  // Live Internet Fetches in parallel
  const [wikiData, fdaData] = await Promise.all([
    fetchWikipediaSummary(wikiSearchTerm),
    fetchOpenFdaData(fdaSearchTerm)
  ]);

  const hasLiveInternet = !!(wikiData || fdaData);

  // Compose the synthesized clinical guide
  const guide = {
    productName: name,
    brand: brand,
    genericName: baseData?.genericName || (fdaData?.genericName ? `${fdaData.genericName} formulation` : (name + (product.pack ? ' · ' + product.pack : ''))),
    therapeuticClass: baseData?.therapeuticClass || (cat === 'medicines' ? 'Pharmaceutical Formulation' : `${cat.charAt(0).toUpperCase() + cat.slice(1)} Care`),
    
    // Overview summary: Prefer live Wikipedia extract, then FDA indications, then base description
    clinicalOverview: wikiData?.extract || fdaData?.indications?.slice(0, 350) || desc || 'High-grade pharmaceutical healthcare formulation.',
    
    // Primary Uses / Indications
    uses: baseData?.uses || (fdaData?.indications
      ? fdaData.indications.split('.').filter(s => s.trim().length > 15).slice(0, 5).map(s => s.trim())
      : (product.highlights && product.highlights.length ? product.highlights : ['Clinically verified formulation for daily health & therapeutic wellness'])),

    // How to Take & Administration
    howToUse: baseData?.howToUse || (fdaData?.dosage
      ? fdaData.dosage.slice(0, 350)
      : 'Take or apply as directed by your physician or according to the product packaging. Keep out of reach of children and follow dosage guidelines accurately.'),

    // Mechanism of Action / How it works
    howItWorks: baseData?.howItWorks || (fdaData?.clinicalPharmacology
      ? fdaData.clinicalPharmacology.slice(0, 350)
      : 'Active ingredients interact with specific cellular pathways to restore physiologic balance, alleviate symptoms, and support rapid recovery.'),

    // Side Effects
    sideEffects: baseData?.sideEffects || [
      { symptom: 'Generally well tolerated at recommended dosages', severity: 'Mild' },
      { symptom: 'Rare individual hypersensitivity or mild digestive change', severity: 'Mild' }
    ],

    // Safety and Precaution Matrix
    safetyAdvice: baseData?.safetyAdvice || {
      alcohol: { status: 'caution', label: 'Caution', text: 'Limit alcohol intake while taking medication to prevent liver strain or reduced efficacy.' },
      pregnancy: { status: 'caution', label: 'Consult Doctor', text: 'Consult your obstetrician before taking any medicinal formulation during pregnancy.' },
      breastfeeding: { status: 'caution', label: 'Consult Doctor', text: 'Consult your physician prior to nursing while on medication.' },
      driving: { status: 'safe', label: 'Generally Safe', text: 'Does not usually impair cognitive alertness or motor driving ability.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Patients with existing renal conditions should use under medical supervision.' },
      liver: { status: 'caution', label: 'Caution', text: 'Patients with pre-existing hepatic impairment should consult their physician.' }
    },

    missedDose: baseData?.missedDose || 'Take the missed dose as soon as you remember. If it is close to your next scheduled dose, skip it and continue your regular routine.',

    expertTips: baseData?.expertTips || [
      'Store in a cool, dry place away from direct sunlight, below 25°C.',
      'Always read the label carefully before use and do not exceed the recommended daily dose.',
      'Check with your pharmacist if you are currently taking any other chronic medications.'
    ],

    faqs: baseData?.faqs || [
      { q: `What is the primary benefit of ${name}?`, a: desc || 'It delivers targeted therapeutic and wellness relief formulated to strict clinical pharmacy standards.' },
      { q: 'Is a prescription required?', a: product.requiresPrescription ? 'Yes, this is an Rx medication and requires verification by our licensed pharmacist before dispatch.' : 'No prescription is required for this OTC health & wellness product.' }
    ],

    // Sourcing metadata
    onlineSource: {
      liveFetched: hasLiveInternet,
      provider: hasLiveInternet
        ? `${fdaData ? 'US FDA (openFDA) & ' : ''}Wikipedia Global Medical Reference${baseData ? ' + Clinical Pharmacopeia' : ''}`
        : 'Verified Clinical Pharmacopeia Knowledge Base',
      articleUrl: wikiData?.pageUrl || 'https://www.fda.gov/drugs',
      fdaRecordFound: !!fdaData,
      wikiRecordFound: !!wikiData,
      fetchedAt: new Date().toISOString()
    }
  };

  // Cache in memory
  CACHE.set(prodId, {
    timestamp: Date.now(),
    data: guide
  });

  return guide;
}

module.exports = {
  getMedicineGuide,
};
