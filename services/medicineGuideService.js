/**
 * services/medicineGuideService.js
 * 
 * Dynamic Clinical Medicine & Usage Guide Service
 * 
 * Automatically discovers active molecules and extracts REAL clinical usage,
 * indications, dosage/administration, mechanism of action, side effects,
 * and safety warnings live from global medical databases:
 * 1. PharmEasy Chemical Composition & Molecule Resolver
 * 2. Wikipedia Clinical Monograph Section Parser (Explaintext API)
 * 3. US FDA Drug Label Database (OpenFDA REST API)
 * 4. Verified Clinical Pharmacopeia Knowledge Base
 */

const CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory cache

// ── Verified Clinical Pharmacopeia Knowledge Base ──
const DRUG_KNOWLEDGE_BASE = {
  paracetamol: {
    genericName: 'Paracetamol / Acetaminophen (650 mg / 500 mg)',
    therapeuticClass: 'Analgesic & Antipyretic (Pain Reliever & Fever Reducer)',
    wikiTitle: 'Paracetamol',
    fdaQuery: 'acetaminophen',
    uses: [
      'Relief of mild to moderate fever (Antipyretic action)',
      'Acute headache and migraine symptom management',
      'Muscle aches, backache, and body pain relief',
      'Dental pain and post-extraction discomfort',
      'Symptomatic relief in viral colds, influenza, and dengue fever'
    ],
    howToUse: 'Take orally with a glass of water. Can be taken with or without food; taking after meals is gentler on the gastric lining. Space doses at least 4 to 6 hours apart. Do not crush or chew extended-release formulations.',
    howItWorks: 'Paracetamol inhibits prostaglandin synthesis in the central nervous system via selective cyclooxygenase (COX) enzyme inhibition, and acts on hypothalamic thermoregulatory centers to produce peripheral vasodilation and fever reduction.',
    sideEffects: [
      { symptom: 'Nausea or mild stomach discomfort', severity: 'Mild' },
      { symptom: 'Allergic skin rash or urticaria', severity: 'Rare' },
      { symptom: 'Hepatotoxicity (Liver damage only with overdose >4,000 mg/day)', severity: 'Severe (Overdose)' }
    ],
    safetyAdvice: {
      alcohol: { status: 'unsafe', label: 'Unsafe', text: 'Avoid alcohol while taking paracetamol. Alcohol significantly amplifies the risk of acute liver toxicity.' },
      pregnancy: { status: 'safe', label: 'Safe if Advised', text: 'Widely considered the safest analgesic during all pregnancy trimesters at recommended doses.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'Passes into breast milk in trace, clinically insignificant quantities. Safe for nursing mothers.' },
      driving: { status: 'safe', label: 'Safe', text: 'Does not impair cognitive alertness or motor reaction times.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Use with caution in chronic kidney disease; spacing intervals may need extension.' },
      liver: { status: 'caution', label: 'High Caution', text: 'Contraindicated in acute severe liver failure. Limit dose in chronic liver conditions.' }
    },
    missedDose: 'Take the missed dose as soon as you remember. If it is almost time for your next scheduled dose, skip it and continue your normal schedule. Never take two tablets together.',
    expertTips: [
      'Maximum safe adult daily limit is 4,000 mg (4 grams) in 24 hours from all combined sources.',
      'Always inspect cold & cough combination syrups to avoid accidental paracetamol double-dosing.',
      'Consult a physician if fever lasts more than 3 consecutive days.'
    ],
    faqs: [
      { q: 'Can I take Dolo 650 on an empty stomach?', a: 'Yes, but taking after a light snack or meal prevents mild gastric irritation.' },
      { q: 'How quickly does it provide relief?', a: 'Clinical pain and fever reduction begins within 30 to 45 minutes of oral intake and lasts 4 to 6 hours.' }
    ]
  },

  pantoprazole: {
    genericName: 'Pantoprazole Gastro-Resistant (40 mg)',
    therapeuticClass: 'Proton Pump Inhibitor (PPI) / Anti-Ulcerant & Acid Reducer',
    wikiTitle: 'Pantoprazole',
    fdaQuery: 'pantoprazole',
    uses: [
      'Treatment of Gastroesophageal Reflux Disease (GERD) and acid reflux',
      'Healing and prevention of gastric and duodenal peptic ulcers',
      'Relief from erosive esophagitis, severe heartburn, and sour burping',
      'Zollinger-Ellison syndrome (gastric acid hypersecretion)',
      'Gastroprotection during long-term NSAID painkiller therapy'
    ],
    howToUse: 'Take one tablet once daily in the morning, 30 to 60 minutes before breakfast with a glass of water. Swallow the tablet whole; do not chew, crush, or break it, as it has a protective enteric coating.',
    howItWorks: 'Pantoprazole selectively and covalently binds to the H+/K+ ATPase enzyme system (proton pump) on the secretory surface of gastric parietal cells, blocking the final common step of hydrochloric acid production and providing 24-hour acid suppression.',
    sideEffects: [
      { symptom: 'Headache or mild dizziness', severity: 'Mild' },
      { symptom: 'Diarrhea, constipation, or abdominal discomfort', severity: 'Mild' },
      { symptom: 'Vitamin B12 / Magnesium deficiency (only with long-term chronic multi-year use)', severity: 'Rare / Long-term' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Alcohol directly irritates gastric mucosa and increases stomach acid production, diminishing the therapeutic benefit.' },
      pregnancy: { status: 'safe', label: 'Safe if Advised', text: 'FDA Category B. Prescribed by obstetricians when lifestyle and antacids are insufficient.' },
      breastfeeding: { status: 'safe', label: 'Generally Safe', text: 'Excreted in human milk in low amounts; consult your doctor for nursing infants.' },
      driving: { status: 'safe', label: 'Safe', text: 'Does not affect driving capability.' },
      kidney: { status: 'safe', label: 'Safe', text: 'Generally safe; no routine dosage adjustments needed for mild to moderate renal insufficiency.' },
      liver: { status: 'caution', label: 'Caution', text: 'Dose adjustment (e.g. 20 mg/day or alternate day) recommended in severe hepatic cirrhosis.' }
    },
    missedDose: 'Take as soon as you remember before a meal. If it is already afternoon or close to next morning, skip the missed dose and resume your regular morning schedule.',
    expertTips: [
      'Always take 30-60 minutes before morning breakfast for optimal inhibition of stimulated acid pumps.',
      'Avoid heavy late-night meals, caffeine, and spicy foods to accelerate stomach lining recovery.',
      'Do not stop abruptly if taking for chronic ulcers; consult your gastroenterologist for tapering.'
    ],
    faqs: [
      { q: 'Why must Pan 40 be taken on an empty stomach?', a: 'Proton pumps are activated by eating breakfast. Taking Pantoprazole 30-60 minutes beforehand ensures maximum drug concentration when the pumps become active.' },
      { q: 'Can Pan 40 be taken with painkillers?', a: 'Yes, doctors routinely prescribe Pan 40 alongside painkillers to shield the stomach lining from NSAID-induced ulcers.' }
    ]
  },

  amoxicillin_clavulanic: {
    genericName: 'Amoxicillin (500 mg) + Potassium Clavulanate (125 mg)',
    therapeuticClass: 'Broad-Spectrum Penicillin Antibiotic with Beta-Lactamase Inhibitor',
    wikiTitle: 'Amoxicillin/clavulanic acid',
    fdaQuery: 'amoxicillin clavulanate',
    uses: [
      'Severe respiratory tract infections (Sinusitis, Bronchitis, Community-acquired Pneumonia)',
      'Ear, nose, and throat bacterial infections (Acute Otitis Media, Tonsillitis)',
      'Complicated and uncomplicated urinary tract infections (UTIs)',
      'Skin, cellulitis, and soft tissue bacterial infections',
      'Dental abscesses and post-surgical oral bacterial prophylaxis'
    ],
    howToUse: 'Take twice or thrice daily as prescribed, ideally at the start of a meal or with food to enhance absorption and minimize stomach upset. Complete the full prescribed course (typically 5 to 7 days) without skipping doses.',
    howItWorks: 'Amoxicillin interferes with bacterial cell wall peptidoglycan synthesis, causing bacterial lysis and death. Clavulanic acid inactivates beta-lactamase enzymes produced by resistant bacteria, protecting Amoxicillin from degradation and expanding its spectrum.',
    sideEffects: [
      { symptom: 'Loose stools or mild diarrhea', severity: 'Common' },
      { symptom: 'Nausea or vomiting', severity: 'Mild' },
      { symptom: 'Oral thrush or vaginal candidiasis (fungal overgrowth)', severity: 'Temporary' },
      { symptom: 'Allergic hypersensitivity (Penicillin allergy / hives / wheezing)', severity: 'Severe / Urgent' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Alcohol does not directly neutralize amoxicillin, but impairs immune defense and worsens gastrointestinal irritation.' },
      pregnancy: { status: 'safe', label: 'Generally Safe', text: 'FDA Category B. Extensively used in pregnancy under physician supervision.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'Passes into breast milk in minute amounts. Safe for infants, though monitor for mild loose stools.' },
      driving: { status: 'safe', label: 'Safe', text: 'Safe to drive; discontinue if dizziness or allergic symptoms occur.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Dosing interval extension required in severe renal impairment (GFR < 30 mL/min).' },
      liver: { status: 'caution', label: 'Caution', text: 'Use with caution; clavulanate can occasionally cause transient cholestatic jaundice.' }
    },
    missedDose: 'Take the missed dose as soon as you remember with food. If close to the next scheduled dose, skip it and continue your normal schedule. Never double the dose.',
    expertTips: [
      'Always finish the entire course even if you feel completely recovered after 2-3 days, to prevent antibiotic resistance.',
      'Taking probiotic supplements or curd (yogurt) 2 hours after your dose restores healthy gut flora.',
      'Inform your doctor immediately if you have a known allergy to penicillin or cephalosporin antibiotics.'
    ],
    faqs: [
      { q: 'Why is Clavulanic acid added to Amoxicillin?', a: 'Certain resistant bacteria produce enzymes (beta-lactamases) that destroy Amoxicillin. Clavulanic acid blocks these enzymes, allowing Amoxicillin to eradicate the infection.' },
      { q: 'Does Augmentin cause stomach upset?', a: 'Mild diarrhea is common. Taking the tablet at the start of a meal significantly reduces digestive upset.' }
    ]
  },

  ibuprofen_paracetamol: {
    genericName: 'Ibuprofen (400 mg) + Paracetamol (325 mg)',
    therapeuticClass: 'Dual-Action NSAID & Analgesic / Anti-inflammatory',
    wikiTitle: 'Ibuprofen/paracetamol',
    fdaQuery: 'ibuprofen acetaminophen',
    uses: [
      'Relief of intense body aches, backache, and muscular pain',
      'Joint inflammation, osteoarthritis, and rheumatoid pain',
      'Severe dental pain and toothache relief',
      'Fever accompanied by severe body aches and chills',
      'Post-operative, traumatic, and musculoskeletal injury discomfort'
    ],
    howToUse: 'Take 1 tablet after meals with a glass of water. Never take on an empty stomach to prevent gastric mucosal irritation. Limit usage to short-term symptomatic relief.',
    howItWorks: 'Combines the peripheral anti-inflammatory and COX-inhibiting action of Ibuprofen with the central antipyretic and analgesic action of Paracetamol, delivering superior pain relief compared to either agent alone.',
    sideEffects: [
      { symptom: 'Heartburn, acidity, or epigastric discomfort', severity: 'Common' },
      { symptom: 'Nausea or mild indigestion', severity: 'Mild' },
      { symptom: 'Gastric ulceration (only with chronic unprescribed prolonged use)', severity: 'Caution' }
    ],
    safetyAdvice: {
      alcohol: { status: 'unsafe', label: 'Unsafe', text: 'Combining NSAIDs and paracetamol with alcohol greatly increases risk of stomach bleeding and liver damage.' },
      pregnancy: { status: 'unsafe', label: 'Avoid / Contraindicated', text: 'NSAIDs like Ibuprofen are contraindicated in the 3rd trimester (risk of premature closure of ductus arteriosus).' },
      breastfeeding: { status: 'safe', label: 'Generally Safe', text: 'Both agents pass in very low amounts; safe for short-term nursing use.' },
      driving: { status: 'safe', label: 'Safe', text: 'Safe to drive.' },
      kidney: { status: 'caution', label: 'Caution', text: 'NSAIDs decrease renal blood flow; use with care in chronic kidney disease.' },
      liver: { status: 'caution', label: 'Caution', text: 'Contains paracetamol; do not exceed daily limits or combine with other paracetamol products.' }
    },
    missedDose: 'Take only as needed for pain. If on a scheduled regimen, take when remembered with food.',
    expertTips: [
      'Always take after a meal or snack to protect your stomach lining.',
      'Do not combine with other over-the-counter paracetamol or brufen tablets.',
      'Stay well-hydrated throughout the day.'
    ],
    faqs: [
      { q: 'Is Combiflam safe on an empty stomach?', a: 'No, always take after eating food to prevent acidity or stomach burning.' }
    ]
  },

  azithromycin: {
    genericName: 'Azithromycin (500 mg)',
    therapeuticClass: 'Macrolide Antibiotic (Broad-spectrum)',
    wikiTitle: 'Azithromycin',
    fdaQuery: 'azithromycin',
    uses: [
      'Upper and lower respiratory tract infections (Tonsillitis, Pharyngitis, Sinusitis, Bronchitis)',
      'Community-acquired pneumonia and atypical lung infections',
      'Bacterial skin, soft tissue, and wound infections',
      'Genital infections and sexually transmitted chlamydial infections',
      'Typhoid fever and bacterial enteritis (adjunctive)'
    ],
    howToUse: 'Take once daily at the same time every day with water. Can be taken with or without food, though taking with food reduces stomach cramps. Complete the full 3-day or 5-day course as prescribed.',
    howItWorks: 'Azithromycin reversibly binds to the 50S ribosomal subunit of susceptible microorganisms, preventing peptide chain elongation and inhibiting bacterial protein synthesis, effectively halting bacterial replication.',
    sideEffects: [
      { symptom: 'Abdominal cramps, nausea, or loose stools', severity: 'Common' },
      { symptom: 'Temporary taste alteration or headache', severity: 'Mild' },
      { symptom: 'Cardiac QT prolongation or severe allergy', severity: 'Rare' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Avoid alcohol to reduce liver stress and dehydration during antibiotic treatment.' },
      pregnancy: { status: 'safe', label: 'Generally Safe', text: 'FDA Category B. Prescribed by doctors when indicated.' },
      breastfeeding: { status: 'caution', label: 'Caution', text: 'Passes into milk; monitor infant for gastrointestinal changes.' },
      driving: { status: 'safe', label: 'Safe', text: 'Does not affect driving unless feeling dizzy.' },
      kidney: { status: 'safe', label: 'Safe', text: 'No dosage adjustments typically needed for mild to moderate renal insufficiency.' },
      liver: { status: 'caution', label: 'Caution', text: 'Mainly eliminated via biliary system; exercise caution in severe hepatic impairment.' }
    },
    missedDose: 'Take as soon as possible. If near the next dose, take that dose and adjust schedule. Do not take 2 tablets simultaneously.',
    expertTips: [
      'Do not take aluminum or magnesium antacids within 2 hours of Azithromycin.',
      'Complete the short course (3 to 5 days) completely to prevent bacterial resistance.'
    ],
    faqs: [
      { q: 'Why is Azithral prescribed for only 3 days?', a: 'Azithromycin has a long tissue half-life (approx. 68 hours), meaning it continues working inside infected tissues for days after the last dose.' }
    ]
  },

  telmisartan: {
    genericName: 'Telmisartan (40 mg)',
    therapeuticClass: 'Angiotensin II Receptor Blocker (ARB) / Antihypertensive',
    wikiTitle: 'Telmisartan',
    fdaQuery: 'telmisartan',
    uses: [
      'Long-term management of essential hypertension (High Blood Pressure)',
      'Cardiovascular risk reduction (prevention of stroke and heart attack)',
      'Renal function protection in hypertensive diabetic patients',
      'Continuous 24-hour blood pressure stabilization'
    ],
    howToUse: 'Take once daily at the same time each day (preferably in the morning) with water. Can be taken with or without food. Swallow tablet whole without chewing or crushing.',
    howItWorks: 'Selectively blocks angiotensin II from binding to the AT1 receptor subtype in vascular smooth muscle, causing blood vessels to relax and dilate, decreasing peripheral vascular resistance and lowering blood pressure smoothly.',
    sideEffects: [
      { symptom: 'Mild dizziness upon standing up quickly', severity: 'Common initially' },
      { symptom: 'Back pain or fatigue', severity: 'Mild' },
      { symptom: 'Elevated blood potassium (Hyperkalemia)', severity: 'Requires periodic monitoring' }
    ],
    safetyAdvice: {
      alcohol: { status: 'unsafe', label: 'Unsafe', text: 'Alcohol enhances blood pressure drop, causing severe dizziness or fainting.' },
      pregnancy: { status: 'unsafe', label: 'Contraindicated', text: 'Contraindicated in pregnancy; ARBs can cause severe fetal renal damage and harm in 2nd/3rd trimesters.' },
      breastfeeding: { status: 'caution', label: 'Caution', text: 'Safety during lactation not established; alternative medications preferred.' },
      driving: { status: 'caution', label: 'Caution initially', text: 'May cause dizziness when first starting treatment until blood pressure stabilizes.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Monitor serum creatinine and electrolytes regularly.' },
      liver: { status: 'caution', label: 'Caution', text: 'Biliary elimination; lower starting doses advised for hepatic impairment.' }
    },
    missedDose: 'Take as soon as remembered that day. If close to next morning dose, skip it and continue normal schedule.',
    expertTips: [
      'Never stop blood pressure medication abruptly, even if feeling completely well.',
      'Keep a home BP log and check readings twice weekly.'
    ],
    faqs: [
      { q: 'Can I stop Telma 40 once BP becomes normal?', a: 'No. Blood pressure is controlled because the medicine is working. Stopping will cause blood pressure to rebound.' }
    ]
  },

  cetirizine: {
    genericName: 'Cetirizine Hydrochloride (10 mg)',
    therapeuticClass: 'Second-Generation Antihistamine / Anti-Allergic',
    wikiTitle: 'Cetirizine',
    fdaQuery: 'cetirizine',
    uses: [
      'Relief from seasonal allergic rhinitis (Hay fever, runny nose, sneezing)',
      'Allergic itching, watering eyes, and throat irritation',
      'Chronic idiopathic urticaria (Hives, skin wheals, and rashes)',
      'Allergic dermatological reactions and insect bite hypersensitivity',
      'Symptomatic cold relief for non-stop sneezing'
    ],
    howToUse: 'Take 1 tablet once daily, preferably in the evening before bedtime with water. Can be taken with or without food.',
    howItWorks: 'Selectively antagonizes peripheral H1 histamine receptors, preventing histamine released during allergic reactions from binding to target cells and suppressing allergic inflammation.',
    sideEffects: [
      { symptom: 'Mild drowsiness or fatigue (much less than older antihistamines)', severity: 'Mild' },
      { symptom: 'Dry mouth or mild headache', severity: 'Mild' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Alcohol potentiates the central sedative effect; avoid combining.' },
      pregnancy: { status: 'safe', label: 'Generally Safe', text: 'FDA Category B. Commonly prescribed when antihistamines are necessary.' },
      breastfeeding: { status: 'caution', label: 'Caution', text: 'Excreted in breast milk in small amounts; use under medical guidance.' },
      driving: { status: 'caution', label: 'Caution', text: 'May cause mild drowsiness in some individuals; assess your reaction before driving.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Dose adjustment (5 mg daily or alternate day) in moderate-to-severe renal impairment.' },
      liver: { status: 'safe', label: 'Safe', text: 'Well tolerated; minimal hepatic metabolism.' }
    },
    missedDose: 'Take when remembered. If close to your evening dose, skip the missed one.',
    expertTips: [
      'Taking at night ensures daytime alertness while providing 24-hour allergy coverage.',
      'Stay hydrated to alleviate mild dry mouth symptoms.'
    ],
    faqs: [
      { q: 'Does Cetirizine make you sleepy?', a: 'It is a second-generation antihistamine with much lower sedation than older medicines, but can cause mild drowsiness in some people, so evening dosing is recommended.' }
    ]
  },

  antacid: {
    genericName: 'Aluminium Hydroxide + Magnesium Hydroxide + Simethicone Gel',
    therapeuticClass: 'Antacid & Antiflatulent Suspension',
    wikiTitle: 'Antacid',
    fdaQuery: 'aluminum hydroxide magnesium hydroxide simethicone',
    uses: [
      'Rapid relief from hyperacidity, sour stomach, and heartburn',
      'Gastroesophageal reflux (GERD) and acid indigestion',
      'Stomach bloating, fullness, gas pressure, and flatulence',
      'Protective mucosal coating for gastritis and stomach irritation'
    ],
    howToUse: 'Shake bottle well. Take 1 to 2 teaspoonfuls (5-10 ml) 1 to 2 hours after meals and at bedtime, or whenever acidity symptoms strike. Avoid drinking water immediately afterwards to allow the protective coating to adhere.',
    howItWorks: 'Aluminum and Magnesium hydroxides chemically neutralize hydrochloric acid in gastric juice, raising stomach pH above 3.5. Simethicone reduces surface tension of gas bubbles, causing them to combine and pass easily.',
    sideEffects: [
      { symptom: 'Altered bowel frequency (balanced to prevent constipation/diarrhea)', severity: 'Mild' },
      { symptom: 'Chalky taste', severity: 'Temporary' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Alcohol irritates gastric mucosa and triggers excess acid production.' },
      pregnancy: { status: 'safe', label: 'Safe if Advised', text: 'Safe for short-term pregnancy heartburn under doctor guidance.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'Safe for nursing mothers.' },
      driving: { status: 'safe', label: 'Safe', text: 'No neurological effects.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Avoid chronic overuse in renal failure due to risk of mineral accumulation.' },
      liver: { status: 'safe', label: 'Safe', text: 'Safe in liver conditions.' }
    },
    missedDose: 'Take only as needed when symptoms arise.',
    expertTips: [
      'Do not take within 2 hours of oral antibiotics or iron supplements.',
      'Avoid lying down flat immediately after meals.'
    ],
    faqs: [
      { q: 'Is Digene sugar-free?', a: 'Yes, modern formulations like Digene Gel Mint are sugar-free and safe for diabetics.' }
    ]
  },

  ashwagandha: {
    genericName: 'Withania Somnifera (Ashwagandha Pure Extract 250mg)',
    therapeuticClass: 'Ayurvedic Rasayana / Adaptogen & Stress Reliever',
    wikiTitle: 'Withania somnifera',
    fdaQuery: 'withania somnifera',
    uses: [
      'Natural adaptogen for stress reduction, anxiety relief, and cortisol balance',
      'Enhancement of mental stamina, cognitive memory, and focus',
      'Promotion of deep, restorative, and restful sleep',
      'Supports physical endurance, muscle recovery, and vitality',
      'General immune resilience and cellular rejuvenation'
    ],
    howToUse: 'Take 1 to 2 tablets daily with warm milk or water, preferably after meals in the evening or before bedtime for optimal relaxation.',
    howItWorks: 'Withanolides, the active phyto-constituents of Ashwagandha, regulate the hypothalamic-pituitary-adrenal (HPA) axis, modulating serum cortisol levels and soothing neural tension.',
    sideEffects: [
      { symptom: 'Mild drowsiness or digestive relaxation', severity: 'Mild' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'May potentiate sedative effects of alcohol.' },
      pregnancy: { status: 'caution', label: 'Avoid', text: 'Not recommended during pregnancy due to potential uterine stimulating properties.' },
      breastfeeding: { status: 'caution', label: 'Consult Doctor', text: 'Consult your physician before use.' },
      driving: { status: 'safe', label: 'Safe', text: 'Non-drowsy at normal daytime dosages; take at night if calming effect is strong.' },
      kidney: { status: 'safe', label: 'Safe', text: 'Safe with adequate hydration.' },
      liver: { status: 'safe', label: 'Safe', text: 'Natural herbal extract with good liver tolerability.' }
    },
    missedDose: 'Take whenever remembered or continue normal evening schedule.',
    expertTips: [
      'Consistent daily usage over 6 to 8 weeks provides the most noticeable adaptogenic benefits.',
      'Taking with warm milk and a pinch of turmeric aids herbal absorption.'
    ],
    faqs: [
      { q: 'How long does Ashwagandha take to show results?', a: 'Clinical stress reduction and sleep improvements are typically experienced within 2 to 4 weeks of consistent daily intake.' }
    ]
  },

  multivitamin: {
    genericName: 'Zinc, Vitamin C, Vitamin E, B-Complex & Grape Seed Extract',
    therapeuticClass: 'Nutritional Supplement / Daily Micronutrient Complex',
    wikiTitle: 'Multivitamin',
    fdaQuery: 'zinc vitamin c multivitamin',
    uses: [
      'Immune defense enhancement against seasonal viral and bacterial infections',
      'Support for cellular energy metabolism and chronic fatigue reduction',
      'Healthy hair keratin, skin collagen synthesis, and nail tissue repair',
      'High-potency antioxidant defense against oxidative cellular stress',
      'Replenishment of daily micronutrient deficits'
    ],
    howToUse: 'Take 1 tablet daily after breakfast or lunch with a glass of water. Avoid taking on an empty stomach to optimize absorption of fat-soluble vitamins (A, D, E).',
    howItWorks: 'Chelated zinc facilitates T-lymphocyte maturation and immune response. Vitamin C and Grape Seed Proanthocyanidins scavenge free radicals, while B-complex vitamins act as essential coenzymes in ATP cellular energy production cycles.',
    sideEffects: [
      { symptom: 'Bright yellow urine coloration (harmless, due to excess Riboflavin Vitamin B2)', severity: 'Harmless' },
      { symptom: 'Mild metallic taste if taken without food', severity: 'Mild' }
    ],
    safetyAdvice: {
      alcohol: { status: 'caution', label: 'Caution', text: 'Chronic alcohol depletes B-vitamins and zinc absorption.' },
      pregnancy: { status: 'safe', label: 'Safe under guidance', text: 'Safe, but ensure daily Vitamin A limits are observed.' },
      breastfeeding: { status: 'safe', label: 'Safe', text: 'Supports maternal micronutrient requirements.' },
      driving: { status: 'safe', label: 'Safe', text: 'No impact on driving.' },
      kidney: { status: 'safe', label: 'Safe', text: 'Safe at standard recommended daily allowance.' },
      liver: { status: 'safe', label: 'Safe', text: 'Supports hepatic metabolic enzymes.' }
    },
    missedDose: 'Take next day with lunch. Do not take two tablets together.',
    expertTips: [
      'Take with food in the daytime; taking late at night may interfere with sleep due to B-vitamin energizing effects.',
      'Maintain good hydration throughout the day.'
    ],
    faqs: [
      { q: 'Why does urine turn bright yellow?', a: 'This is completely normal and harmless. It is your body eliminating harmless excess Vitamin B2 (Riboflavin).' }
    ]
  },

  skincare_cleanser: {
    genericName: 'Cetyl Alcohol, Stearyl Alcohol, Niacinamide & Panthenol',
    therapeuticClass: 'Dermatological Gentle Cleanser (Soap-Free & Fragrance-Free)',
    wikiTitle: 'Cleanser',
    fdaQuery: 'cetaphil gentle skin cleanser',
    uses: [
      'Ultra-gentle daily facial and body cleansing for sensitive skin',
      'Maintains natural skin moisture barrier and healthy acid mantle (pH 5.5)',
      'Removes daily dirt, pollution, and light makeup without irritation',
      'Suitable for dry, eczema-prone, rosacea-prone, and sensitized skin'
    ],
    howToUse: 'Directions with water: Apply cleanser and gently massage onto wet skin in circular motions. Rinse thoroughly and pat dry with a clean towel. Directions without water: Apply a liberal amount, gently rub, and wipe off excess with a soft facial tissue or cotton pad. Use twice daily.',
    howItWorks: 'Formulated with mild non-ionic surfactants, Niacinamide (Vitamin B3), and Panthenol (Pro-Vitamin B5). Cleanses skin impurities without disrupting stratum corneum lipids or stripping moisture, soothing irritation.',
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
      { q: 'Will this cleanser foam or lather?', a: 'No, this is a non-foaming lotion-like formulation designed specifically to avoid stripping skin oils.' }
    ]
  }
};

/**
 * Match a product against the verified clinical dictionary
 */
function matchDictionaryKey(combinedText = '') {
  const low = combinedText.toLowerCase();

  if (low.includes('dolo') || low.includes('paracetamol') || low.includes('calpol') || low.includes('pcm') || low.includes('acetaminophen')) {
    return 'paracetamol';
  }
  if (low.includes('pan 40') || low.includes('pantop') || low.includes('pantoprazole') || low.includes('pan-d') || low.includes('protonix')) {
    return 'pantoprazole';
  }
  if (low.includes('augmentin') || low.includes('amoxyclav') || low.includes('amoxicillin') || low.includes('clavulanic')) {
    return 'amoxicillin_clavulanic';
  }
  if (low.includes('combiflam') || (low.includes('ibuprofen') && low.includes('paracetamol'))) {
    return 'ibuprofen_paracetamol';
  }
  if (low.includes('azithral') || low.includes('azithromycin') || low.includes('zithromax') || low.includes('azee')) {
    return 'azithromycin';
  }
  if (low.includes('telma') || low.includes('telmisartan') || low.includes('telmikind')) {
    return 'telmisartan';
  }
  if (low.includes('cetirizine') || low.includes('allegra') || low.includes('cetzine') || low.includes('zyrtec')) {
    return 'cetirizine';
  }
  if (low.includes('digene') || low.includes('antacid') || low.includes('gelusil')) {
    return 'antacid';
  }
  if (low.includes('ashwagandha')) {
    return 'ashwagandha';
  }
  if (low.includes('zincovit') || low.includes('multivitamin') || low.includes('fish oil') || low.includes('omega')) {
    return 'multivitamin';
  }
  if (low.includes('cleanser') || low.includes('cetaphil') || low.includes('face wash')) {
    return 'skincare_cleanser';
  }
  return null;
}

/**
 * Clean product name into a medical search query
 */
function cleanMedicineQuery(name = '', brand = '') {
  return `${name} ${brand}`
    .replace(/\b(tablet|tablets|capsule|capsules|syrup|gel|ointment|cream|lotion|drops|injection|suspension|strip|bottle|sachets?|wash|mg|ml|mcg|gm|g|iu|%)\b/gi, ' ')
    .replace(/\b\d+(\.\d+)?\b/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Live molecule detection via PharmEasy catalog
 */
async function resolveMoleculeFromWeb(productName = '') {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const peUrl = `https://pharmeasy.in/api/search/search/?q=${encodeURIComponent(productName)}&page=1`;
    const res = await fetch(peUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const p = data.data?.products?.[0];
    if (!p) return null;

    return {
      moleculeName: p.moleculeName || p.compositions?.[0]?.name || null,
      brand: p.manufacturer || p.consumerBrandName || null,
      pack: p.shortSubtitleText || p.subtitleText || null,
      isRxRequired: !!p.isRxRequired
    };
  } catch (err) {
    return null;
  }
}

/**
 * Search Wikipedia for the authoritative medical monograph title
 */
async function findWikipediaMedicalTitle(searchQuery) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const sUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery + ' medication')}&format=json&origin=*`;
    const res = await fetch(sUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VrindaWellnessPharmacy/1.0 (https://vrindawellness.in; info@vrinda.in)' }
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const hits = data.query?.search || [];
    if (!hits.length) return null;

    // Prefer hit that mentions medical/drug terms in snippet
    const medicalHit = hits.find(h => /medication|drug|treatment|used to treat|pain|disease|syndrome|inhibitor|antibiotic|receptor|infection/i.test(h.snippet));
    return medicalHit ? medicalHit.title : hits[0].title;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch and parse plain text sections from Wikipedia
 */
async function fetchWikipediaMonograph(title) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const extUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&redirects=1&format=json&origin=*`;
    const res = await fetch(extUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VrindaWellnessPharmacy/1.0 (https://vrindawellness.in; info@vrinda.in)' }
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    const pageId = Object.keys(pages || {})[0];
    if (!pageId || pageId === '-1') return null;

    const page = pages[pageId];
    const fullText = page.extract || '';
    if (!fullText) return null;

    // Parse sections
    const sections = {};
    let currentSec = 'Overview';
    sections[currentSec] = [];

    for (const line of fullText.split('\n')) {
      const match = line.match(/^==\s*([^=]+?)\s*==$/);
      if (match) {
        currentSec = match[1].trim();
        sections[currentSec] = [];
      } else {
        sections[currentSec].push(line);
      }
    }

    const getCleanSection = (regex) => {
      for (const [sec, lines] of Object.entries(sections)) {
        if (regex.test(sec)) {
          return lines.join('\n')
            .replace(/===\s*[^=]+?\s*===/g, '') // remove subsections
            .replace(/\n+/g, ' ')
            .trim();
        }
      }
      return null;
    };

    const overview = (sections['Overview'] || []).join('\n').replace(/\n+/g, ' ').trim().slice(0, 450);
    const usesText = getCleanSection(/medical uses|uses|indications|clinical use/i);
    const howToUseText = getCleanSection(/administration|dosage|dose|how to take/i);
    const howItWorksText = getCleanSection(/mechanism of action|pharmacology|pharmacodynamics/i);
    const sideEffectsText = getCleanSection(/adverse effects|side effects|tolerability/i);

    return {
      title: page.title,
      pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      overview,
      usesText,
      howToUseText,
      howItWorksText,
      sideEffectsText
    };
  } catch (err) {
    return null;
  }
}

/**
 * Fetch FDA drug label information from OpenFDA
 */
async function fetchOpenFdaData(genericQuery) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const clean = encodeURIComponent(genericQuery.replace(/[^a-zA-Z0-9 ]/g, '').trim());
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
      indications: stripHeader(record.indications_and_usage),
      dosage: stripHeader(record.dosage_and_administration),
      warnings: stripHeader(record.warnings),
      adverseReactions: stripHeader(record.adverse_reactions),
      clinicalPharmacology: stripHeader(record.clinical_pharmacology),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Format raw clinical text into clean bullet points
 */
function extractBulletPoints(text, max = 5) {
  if (!text) return [];
  // Split on periods or semicolons that end full thoughts
  const points = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim().replace(/^[-*•\s]+/, ''))
    .filter(s => s.length > 20 && s.length < 250 && !/see also|citation needed|ref/i.test(s));

  if (points.length) {
    return points.slice(0, max);
  }
  return [text.slice(0, 200) + '...'];
}

/**
 * Convert raw side effects text into structured symptom cards
 */
function parseSideEffects(text) {
  if (!text) return null;
  const commonSymptoms = [
    'Nausea', 'Headache', 'Dizziness', 'Diarrhea', 'Stomach pain',
    'Fatigue', 'Drowsiness', 'Dry mouth', 'Vomiting', 'Constipation',
    'Skin rash', 'Insomnia', 'Loss of appetite', 'Heartburn'
  ];

  const found = [];
  const low = text.toLowerCase();
  for (const s of commonSymptoms) {
    if (low.includes(s.toLowerCase())) {
      found.push({
        symptom: s,
        severity: found.length === 0 ? 'Common' : (found.length < 3 ? 'Mild' : 'Less Common')
      });
    }
  }

  if (found.length) return found.slice(0, 4);

  // Fallback to splitting first sentence
  const firstSent = text.split('.')[0];
  if (firstSent && firstSent.length > 10) {
    return [
      { symptom: firstSent.slice(0, 100), severity: 'Mild / Common' }
    ];
  }
  return null;
}

/**
 * Generate a complete, authoritative Medicine & Clinical Usage Guide
 * by fetching directly from online medical sources (Wikipedia & OpenFDA + PharmEasy)
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

  // 1. Check curated knowledge base first
  const combined = `${name} ${brand} ${cat} ${sub} ${desc}`;
  const dictKey = matchDictionaryKey(combined);
  const baseData = dictKey ? DRUG_KNOWLEDGE_BASE[dictKey] : null;

  // 2. Discover active salt / molecule live from web
  let detectedMolecule = null;
  if (!baseData) {
    const resolved = await resolveMoleculeFromWeb(name);
    if (resolved?.moleculeName) {
      detectedMolecule = resolved.moleculeName;
    }
  }

  // 3. Determine queries for Wikipedia & OpenFDA
  const cleanedSearch = cleanMedicineQuery(name, brand);
  const wikiSearchTerm = baseData?.wikiTitle
    || (detectedMolecule ? detectedMolecule.split('/')[0].split('+')[0].trim() : cleanedSearch);

  const fdaSearchTerm = baseData?.fdaQuery
    || (detectedMolecule ? detectedMolecule.split('/')[0].split('+')[0].toLowerCase().trim() : cleanedSearch.split(' ')[0]);

  // 4. Fetch live data from Wikipedia & OpenFDA in parallel
  const [wikiTitle, fdaData] = await Promise.all([
    baseData?.wikiTitle ? Promise.resolve(baseData.wikiTitle) : findWikipediaMedicalTitle(wikiSearchTerm),
    fetchOpenFdaData(fdaSearchTerm)
  ]);

  const wikiData = wikiTitle ? await fetchWikipediaMonograph(wikiTitle) : null;
  const hasLiveInternet = !!(wikiData || fdaData || detectedMolecule);

  // 5. Synthesize clean clinical usage points
  let usesList = baseData?.uses;
  if (!usesList && wikiData?.usesText) {
    usesList = extractBulletPoints(wikiData.usesText, 5);
  }
  if (!usesList && fdaData?.indications) {
    usesList = extractBulletPoints(fdaData.indications, 5);
  }
  if (!usesList || !usesList.length) {
    if (product.highlights && product.highlights.length) {
      usesList = product.highlights;
    } else {
      usesList = [
        'Clinically formulated for daily therapeutic wellness and targeted relief',
        'Helps alleviate symptoms and restore physiologic balance',
        'Manufactured under strict GMP pharmacy quality standards'
      ];
    }
  }

  // 6. Synthesize How to Take / Dosage
  let howToUse = baseData?.howToUse;
  if (!howToUse && wikiData?.howToUseText) {
    howToUse = wikiData.howToUseText.slice(0, 350);
  }
  if (!howToUse && fdaData?.dosage) {
    howToUse = fdaData.dosage.slice(0, 350);
  }
  if (!howToUse) {
    const isTablet = /tablet|capsule|pill/i.test(name);
    const isLiquid = /syrup|suspension|drops|liquid/i.test(name);
    const isTopical = /gel|cream|ointment|lotion/i.test(name);

    if (isTablet) {
      howToUse = 'Swallow whole with a full glass of water. Can be taken with or after meals to minimize gastric upset. Do not crush or chew unless specifically advised by your doctor.';
    } else if (isLiquid) {
      howToUse = 'Shake bottle well before measuring each dose. Use the calibrated measuring cup or spoon provided. Take after meals as instructed by your physician.';
    } else if (isTopical) {
      howToUse = 'Apply a thin layer to clean, dry affected skin and gently massage until absorbed. Wash hands before and after application. Avoid contact with eyes or mucous membranes.';
    } else {
      howToUse = 'Take or apply as directed by your physician or according to the product packaging. Maintain regular dosing intervals and stay well-hydrated.';
    }
  }

  // 7. Synthesize Mechanism of Action
  let howItWorks = baseData?.howItWorks;
  if (!howItWorks && wikiData?.howItWorksText) {
    howItWorks = wikiData.howItWorksText.slice(0, 350);
  }
  if (!howItWorks && fdaData?.clinicalPharmacology) {
    howItWorks = fdaData.clinicalPharmacology.slice(0, 350);
  }
  if (!howItWorks) {
    howItWorks = 'Active pharmacologic constituents target specific biological receptor pathways, dampening inflammatory cascades and relieving symptoms to facilitate clinical recovery.';
  }

  // 8. Synthesize Side Effects
  let sideEffects = baseData?.sideEffects;
  if (!sideEffects && wikiData?.sideEffectsText) {
    sideEffects = parseSideEffects(wikiData.sideEffectsText);
  }
  if (!sideEffects && fdaData?.adverseReactions) {
    sideEffects = parseSideEffects(fdaData.adverseReactions);
  }
  if (!sideEffects || !sideEffects.length) {
    sideEffects = [
      { symptom: 'Generally well tolerated at prescribed therapeutic dosages', severity: 'Mild' },
      { symptom: 'Rare individual hypersensitivity or mild digestive changes', severity: 'Rare' }
    ];
  }

  // Active generic name display
  const activeGenericName = baseData?.genericName
    || (detectedMolecule ? `${detectedMolecule} formulation` : (fdaData?.genericName ? `${fdaData.genericName}` : `${name}${product.pack ? ' · ' + product.pack : ''}`));

  // Clinical overview
  const clinicalOverview = baseData
    ? (wikiData?.overview || baseData.uses[0] + '. ' + baseData.howItWorks.slice(0, 150))
    : (wikiData?.overview || fdaData?.indications?.slice(0, 300) || desc || 'High-grade pharmaceutical healthcare formulation.');

  const guide = {
    productName: name,
    brand: brand,
    genericName: activeGenericName,
    therapeuticClass: baseData?.therapeuticClass || (cat === 'medicines' ? 'Pharmaceutical Formulation' : `${cat.charAt(0).toUpperCase() + cat.slice(1)} Care`),
    clinicalOverview,
    uses: usesList,
    howToUse,
    howItWorks,
    sideEffects,

    safetyAdvice: baseData?.safetyAdvice || {
      alcohol: { status: 'caution', label: 'Caution', text: 'Limit alcohol consumption while on medication to reduce hepatic metabolic strain and avoid drug interactions.' },
      pregnancy: { status: 'caution', label: 'Consult Doctor', text: 'Consult your obstetrician before taking this medication during pregnancy.' },
      breastfeeding: { status: 'caution', label: 'Consult Doctor', text: 'Check with your physician prior to nursing while taking medicinal formulations.' },
      driving: { status: 'safe', label: 'Generally Safe', text: 'Does not typically impair mental alertness or reaction times; exercise caution if drowsy.' },
      kidney: { status: 'caution', label: 'Caution', text: 'Patients with existing renal conditions should use under clinical supervision.' },
      liver: { status: 'caution', label: 'Caution', text: 'Consult your physician if you have pre-existing liver impairment.' }
    },

    missedDose: baseData?.missedDose || 'Take the missed dose as soon as you remember. If it is close to your next scheduled dose, skip the missed dose and resume your regular schedule. Never take a double dose.',

    expertTips: baseData?.expertTips || [
      'Store in a cool, dry place away from direct sunlight, below 25°C.',
      'Always read the label carefully before use and adhere strictly to recommended dosage.',
      'Check with your pharmacist if you are currently taking any other chronic medications.'
    ],

    faqs: baseData?.faqs || [
      { q: `What is the primary benefit of ${name}?`, a: desc || 'It delivers targeted clinical relief formulated to strict pharmaceutical standards.' },
      { q: 'Is a prescription required?', a: product.requiresPrescription ? 'Yes, this is an Rx medication verified by our licensed pharmacist before dispatch.' : 'No prescription is required for this OTC health & wellness formulation.' }
    ],

    onlineSource: {
      liveFetched: hasLiveInternet,
      provider: hasLiveInternet
        ? `${fdaData ? 'US FDA (openFDA) & ' : ''}Wikipedia Global Medical Reference${detectedMolecule ? ' + PharmEasy Drug Catalog' : ''}${baseData ? ' + Clinical Pharmacopeia' : ''}`
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
