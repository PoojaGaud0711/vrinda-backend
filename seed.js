require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const products = [
  // ── MEDICINES ──
  {
    name: 'Azithral 500 Tablet', brand: 'Alembic', pack: '5 tablets', price: 120, mrp: 132,
    category: 'medicines', subcategory: 'prescription', requiresPrescription: true, stock: 45, unit: 'per strip',
    description: 'Azithral 500 Tablet is an antibiotic used to treat various bacterial infections of the respiratory tract, throat, lungs, skin, and eyes. Works by stopping bacteria from growing.',
    highlights: ['Broad spectrum antibiotic', 'Convenient once-daily dosing', 'Trusted Alembic quality'],
    image: 'https://picsum.photos/seed/vrinda-med1/400/300.jpg'
  },
  {
    name: 'Telma 40 Tablet', brand: 'Glenmark', pack: '10 tablets', price: 148, mrp: 160,
    category: 'medicines', subcategory: 'prescription', requiresPrescription: true, stock: 30, unit: 'per strip',
    description: 'Telma 40 Tablet belongs to a group of medicines known as angiotensin receptor blockers (ARBs). It is widely prescribed to manage high blood pressure and prevent heart complications.',
    highlights: ['Effective 24-hour BP control', 'Protects heart and kidneys', 'Prescribed by top cardiologists'],
    image: 'https://picsum.photos/seed/vrinda-med2/400/300.jpg'
  },
  {
    name: 'Dolo 650 Tablet', brand: 'Micro Labs', pack: '15 tablets', price: 31, mrp: 34,
    category: 'medicines', subcategory: 'otc', stock: 80, unit: 'per strip',
    description: 'Dolo 650 Tablet contains paracetamol that helps relieve pain and reduce fever. Used commonly for headaches, body aches, toothache, and common cold symptoms.',
    highlights: ['Fast fever reduction', 'Relieves mild to moderate body pain', 'Gentle on stomach when taken as advised'],
    image: 'https://picsum.photos/seed/vrinda-med3/400/300.jpg'
  },
  {
    name: 'Digene Gel — Mint', brand: 'Abbott', pack: '200 ml', price: 120, mrp: 135,
    category: 'medicines', subcategory: 'otc', stock: 25, unit: 'per bottle',
    description: 'Digene Gel is an antacid that provides quick relief from acidity, heartburn, and gas discomfort. Sugar-free cooling mint flavour is suitable for all adults.',
    highlights: ['Fast antacid relief in minutes', 'Sugar-free mint formulation', 'Clinically tested dual action'],
    image: 'https://picsum.photos/seed/vrinda-med4/400/300.jpg'
  },
  {
    name: 'Dabur Chyawanprash', brand: 'Dabur', pack: '1 kg', price: 390, mrp: 415,
    category: 'medicines', subcategory: 'ayurvedic', tag: 'Bestseller', stock: 40, unit: 'per jar',
    description: 'Dabur Chyawanprash is an authentic Ayurvedic formulation packed with 40+ natural herbs and enriched with Amla to boost immunity, stamina, and overall vitality.',
    highlights: ['2X immunity support backed by clinical studies', 'Rich in natural Vitamin C and antioxidants', 'Ancient Ayurvedic recipe'],
    image: 'https://picsum.photos/seed/vrinda-med5/400/300.jpg'
  },
  {
    name: 'Himalaya Ashwagandha', brand: 'Himalaya', pack: '60 tablets', price: 210, mrp: 230,
    category: 'medicines', subcategory: 'ayurvedic', stock: 35, unit: 'per bottle',
    description: 'Pure Ashwagandha extract helps reduce stress, anxiety, and fatigue while naturally supporting restful sleep and rejuvenating mind and body energy.',
    highlights: ['100% vegetarian pure herb extract', 'Adaptogen for stress relief and cortisol balance', 'No artificial colors or preservatives'],
    image: 'https://picsum.photos/seed/vrinda-med6/400/300.jpg'
  },
  {
    name: 'Fish Oil Omega-3', brand: 'MuscleBlaze', pack: '60 capsules', price: 549, mrp: 699,
    category: 'medicines', subcategory: 'supplements', tag: 'Bestseller', stock: 20, unit: 'per bottle',
    description: 'Premium purified fish oil delivering high potency EPA and DHA essential fatty acids to support joint mobility, cardiovascular health, and sharper cognitive focus.',
    highlights: ['Molecularly distilled for pure grade', 'Anti-reflux enteric coating — no fishy burps', '1000mg fish oil per softgel'],
    image: 'https://picsum.photos/seed/vrinda-med7/400/300.jpg'
  },
  {
    name: 'Zincovit Multivitamin', brand: 'Apex Labs', pack: '15 tablets', price: 105, mrp: 115,
    category: 'medicines', subcategory: 'supplements', stock: 50, unit: 'per strip',
    description: 'Comprehensive daily multivitamin and mineral tablet fortified with Zinc, Vitamin C, Vitamin E, and grape seed extract for optimal metabolic energy and cellular defense.',
    highlights: ['High-absorption chelated zinc', 'Enriched with natural grape seed extract', 'Complete daily nutritional support'],
    image: 'https://picsum.photos/seed/vrinda-med8/400/300.jpg'
  },

  // ── BEAUTY ──
  {
    name: 'Gentle Skin Cleanser', brand: 'Cetaphil', pack: '125 ml', price: 385, mrp: 420,
    category: 'beauty', subcategory: 'skincare', tag: 'Bestseller', stock: 30, unit: 'per bottle',
    description: 'Dermatologist recommended non-foaming gentle cleanser designed for dry to normal sensitive skin. Preserves moisture barrier without stripping essential oils.',
    highlights: ['Soap-free and fragrance-free', 'pH balanced for sensitive skin', 'Can be used with or without water'],
    image: 'https://picsum.photos/seed/vrinda-bty1/400/300.jpg'
  },
  {
    name: 'Vitamin C Face Serum', brand: 'Minimalist', pack: '30 ml', price: 599, mrp: 699,
    category: 'beauty', subcategory: 'skincare', tag: 'New', stock: 22, unit: 'per bottle',
    description: 'Stabilized 10% Vitamin C serum infused with Centella water for radiant, glowing skin and visible fading of dark spots and hyperpigmentation.',
    highlights: ['Non-irritating stable Vitamin C', 'Anti-dullness and pollution protection', 'Fragrance-free and non-comedogenic'],
    image: 'https://picsum.photos/seed/vrinda-bty2/400/300.jpg'
  },
  {
    name: 'Anti-Hair Fall Oil', brand: 'Himalaya', pack: '200 ml', price: 185, mrp: 200,
    category: 'beauty', subcategory: 'haircare', stock: 40, unit: 'per bottle',
    description: 'Formulated with Bhringaraja and Amla to stimulate hair follicles, strengthen roots, and protect scalp health against premature thinning.',
    highlights: ['Rich in herbal phyto-nutrients', 'Reduces hair breakage', 'Non-sticky daily massage oil'],
    image: 'https://picsum.photos/seed/vrinda-bty3/400/300.jpg'
  },
  {
    name: 'Onion Hair Oil', brand: 'Mamaearth', pack: '150 ml', price: 349, mrp: 399,
    category: 'beauty', subcategory: 'haircare', stock: 18, unit: 'per bottle',
    description: 'Enriched with onion seed oil, Redensyl, and natural carrier oils to nourish roots and improve hair volume and shine.',
    highlights: ['Powered by Redensyl technology', 'Free of mineral oil and silicones', 'Safe for chemically treated hair'],
    image: 'https://picsum.photos/seed/vrinda-bty4/400/300.jpg'
  },
  {
    name: 'Soft Moisturising Cream', brand: 'Nivea', pack: '300 ml', price: 285, mrp: 310,
    category: 'beauty', subcategory: 'bodycare', stock: 25, unit: 'per jar',
    description: 'Light non-greasy moisturizing formula with Jojoba oil and Vitamin E for deeply hydrated, velvety smooth skin that lasts all day.',
    highlights: ['Fast-absorbing soft texture', 'Suitable for face, hands, and body', 'Dermatologically verified'],
    image: 'https://picsum.photos/seed/vrinda-bty5/400/300.jpg'
  },
  {
    name: 'Moisturising Lotion', brand: 'Cetaphil', pack: '100 ml', price: 325, mrp: 350,
    category: 'beauty', subcategory: 'bodycare', stock: 4, unit: 'per bottle',
    description: 'Daily lightweight moisturizer providing long-lasting 48-hour hydration for sensitive skin with avocado oil and provitamin B5.',
    highlights: ['Long-lasting continuous moisture', 'Lightweight non-greasy finish', 'Hypoallergenic'],
    image: 'https://picsum.photos/seed/vrinda-bty6/400/300.jpg'
  },
  {
    name: 'Men Face Wash', brand: 'Nivea', pack: '100 ml', price: 190, mrp: 210,
    category: 'beauty', subcategory: 'grooming', stock: 35, unit: 'per tube',
    description: 'Deep cleansing face wash specially designed for men with active carbon to eliminate excess oil, deep grime, and pollutants.',
    highlights: ['Removes 10X deep impurities', 'Does not dry out facial skin', 'Refreshes tired skin instantly'],
    image: 'https://picsum.photos/seed/vrinda-bty7/400/300.jpg'
  },
  {
    name: 'Beard & Mustache Oil', brand: 'Beardo', pack: '50 ml', price: 349, mrp: 499,
    category: 'beauty', subcategory: 'grooming', stock: 20, unit: 'per bottle',
    description: 'Premium conditioning blend of argan, jojoba, and almond oils to soften coarse facial hair, tame frizz, and soothe itchiness underneath.',
    highlights: ['Conditions and shines beard', 'Prevents beard dandruff and itch', 'Subtle masculine cedarwood scent'],
    image: 'https://picsum.photos/seed/vrinda-bty8/400/300.jpg'
  },

  // ── SNACKS ──
  {
    name: 'High Protein Makhana', brand: 'MuscleBlaze', pack: '50 g', price: 249, mrp: 299,
    category: 'snacks', subcategory: 'protein', stock: 40, unit: 'per pouch',
    description: 'Slow-roasted crispy foxnuts infused with pure whey protein isolate and roasted Indian spices. 12g protein per pack with zero trans fat.',
    highlights: ['12g pure protein per pouch', 'Slow roasted, never fried', 'High in calcium and fiber'],
    image: 'https://picsum.photos/seed/vrinda-snk1/400/300.jpg'
  },
  {
    name: 'Roasted Chana Masala', brand: 'Nutraj', pack: '200 g', price: 149, mrp: 175,
    category: 'snacks', subcategory: 'protein', stock: 50, unit: 'per pouch',
    description: 'Crunchy golden roasted Bengal gram coated in tangy traditional chaat masala. Packed with natural plant protein and dietary fiber.',
    highlights: ['Guilt-free crunchy snack', 'Naturally low glycemic index', 'Rich in vegetarian protein'],
    image: 'https://picsum.photos/seed/vrinda-snk2/400/300.jpg'
  },
  {
    name: 'California Almonds', brand: 'Nutraj', pack: '500 g', price: 549, mrp: 649,
    category: 'snacks', subcategory: 'dryfruits', tag: 'Bestseller', stock: 30, unit: 'per pack',
    description: 'Hand-picked premium 100% California whole almonds. Rich in Vitamin E, healthy monounsaturated fats, and magnesium for brain energy.',
    highlights: ['Hand-sorted jumbo almonds', 'Rich in Vitamin E and antioxidants', 'Vacuum packed for crunchy freshness'],
    image: 'https://picsum.photos/seed/vrinda-snk3/400/300.jpg'
  },
  {
    name: 'Cashew Nuts W320', brand: 'Nutraj', pack: '500 g', price: 625, mrp: 699,
    category: 'snacks', subcategory: 'dryfruits', stock: 25, unit: 'per pack',
    description: 'Creamy, sweet grade-W320 whole cashews sourced from premium farms. Perfect healthy snack or culinary addition.',
    highlights: ['Whole whole unbroken W320 grade', 'Naturally sweet and buttery', 'Rich in heart-friendly fats'],
    image: 'https://picsum.photos/seed/vrinda-snk4/400/300.jpg'
  },
  {
    name: 'Green Tea Bags', brand: 'Organic India', pack: '25 bags', price: 220, mrp: 240,
    category: 'snacks', subcategory: 'teas', stock: 35, unit: 'per box',
    description: 'Certified organic whole leaf green tea infused with Tulsi for a refreshing antioxidant boost that aids metabolism and digestion.',
    highlights: ['Rich in catechins and polyphenols', 'Gentle naturally occurring caffeine', 'Unbleached biodegradable tea bags'],
    image: 'https://picsum.photos/seed/vrinda-snk5/400/300.jpg'
  },
  {
    name: 'Tulsi Ginger Tea', brand: 'Organic India', pack: '25 bags', price: 230, mrp: 250,
    category: 'snacks', subcategory: 'teas', stock: 30, unit: 'per box',
    description: 'Soothing blend of three sacred Tulsi varieties with warming organic ginger. Helps relieve chest congestion and supports stomach digestion.',
    highlights: ['Caffeine-free herbal infusion', 'Warming relief for throat and digestion', '100% organic herbs'],
    image: 'https://picsum.photos/seed/vrinda-snk6/400/300.jpg'
  },
  {
    name: 'Granola Bars', brand: 'Nature Valley', pack: '2 × 42 g', price: 275, mrp: 300,
    category: 'snacks', subcategory: 'bars', stock: 45, unit: 'per box',
    description: 'Crunchy whole grain rolled oats with real Canadian honey. An on-the-go snack offering sustained complex carbohydrates for busy days.',
    highlights: ['100% whole grain rolled oats', 'No artificial flavours or colours', 'Convenient twin bar packs'],
    image: 'https://picsum.photos/seed/vrinda-snk7/400/300.jpg'
  },
  {
    name: 'Dates & Nuts Energy Bar', brand: 'Yoga Bar', pack: '40 g', price: 99, mrp: 120,
    category: 'snacks', subcategory: 'bars', tag: 'New', stock: 60, unit: 'per bar',
    description: 'Wholesome clean bar crafted from Arabian dates, roasted almonds, cashews, and chia seeds. Zero added sugar or preservatives.',
    highlights: ['100% clean ingredients — no added sugar', 'Natural energy from dates and nuts', 'High in dietary fiber'],
    image: 'https://picsum.photos/seed/vrinda-snk8/400/300.jpg'
  },

  // ── NEEDFULS ──
  {
    name: 'Pants Diapers — M', brand: 'MamyPoko', pack: '62 pants', price: 749, mrp: 899,
    category: 'needfuls', subcategory: 'baby', tag: 'Bestseller', stock: 25, unit: 'per pack',
    description: 'Crisscross absorbent sheet diapers offering up to 12 hours of leak-free overnight dryness. Soft stretchable waistband ensures baby comfort.',
    highlights: ['Up to 12 hours absorption', 'Soft breathable waistband prevents red marks', 'Disposal tape for easy rolling'],
    image: 'https://picsum.photos/seed/vrinda-ndf1/400/300.jpg'
  },
  {
    name: 'Gentle Baby Wipes', brand: 'Himalaya', pack: '72 wipes', price: 185, mrp: 199,
    category: 'needfuls', subcategory: 'baby', stock: 40, unit: 'per pack',
    description: 'Extra soft baby cleansing wipes enriched with Indian Lotus and Aloe Vera to cleanse sensitive skin while soothing diaper areas.',
    highlights: ['Hypoallergenic and alcohol-free', 'Enriched with Aloe Vera and Lotus', 'Maintains skin pH balance'],
    image: 'https://picsum.photos/seed/vrinda-ndf2/400/300.jpg'
  },
  {
    name: 'Ultra Clean XL Pads', brand: 'Whisper', pack: '30 pads', price: 319, mrp: 359,
    category: 'needfuls', subcategory: 'feminine', stock: 35, unit: 'per pack',
    description: 'XL sanitary pads designed with Lock Core technology and odour neutralizer pearls for total leak-lock defense during heavy flow days.',
    highlights: ['Wider back for total leak protection', 'Odour lock technology', 'Soft wings stay firmly in place'],
    image: 'https://picsum.photos/seed/vrinda-ndf3/400/300.jpg'
  },
  {
    name: 'V Wash Plus', brand: 'V-Wash', pack: '100 ml', price: 195, mrp: 215,
    category: 'needfuls', subcategory: 'feminine', stock: 30, unit: 'per bottle',
    description: 'Specially formulated intimate hygiene wash with lactic acid and tea tree oil to maintain a healthy vaginal pH of 3.5.',
    highlights: ['Maintains natural 3.5 pH level', 'Enriched with tea tree oil and sea buckthorn', 'Prevents itching and irritation'],
    image: 'https://picsum.photos/seed/vrinda-ndf4/400/300.jpg'
  },
  {
    name: 'Facial Tissues', brand: 'Origami', pack: '100 pulls', price: 99, mrp: 110,
    category: 'needfuls', subcategory: 'napkins', stock: 50, unit: 'per box',
    description: '2-ply ultra-soft facial tissues made from virgin plantation wood pulp. Extremely absorbent and gentle on the most delicate facial skin.',
    highlights: ['100% virgin pulp fibers', 'Lint-free and dermatologist safe', 'Attractive designer box'],
    image: 'https://picsum.photos/seed/vrinda-ndf5/400/300.jpg'
  },
  {
    name: 'Antibacterial Wipes', brand: 'Dettol', pack: '40 wipes', price: 75, mrp: 85,
    category: 'needfuls', subcategory: 'napkins', stock: 60, unit: 'per pack',
    description: 'Multi-purpose sanitizing wipes proven to kill 99.9% of bacteria and germs. Safe for hands, office desks, phones, and travel surfaces.',
    highlights: ['Kills 99.9% bacteria and viruses', 'Alcohol-free and gentle on skin', 'Resealable moisture lock pack'],
    image: 'https://picsum.photos/seed/vrinda-ndf6/400/300.jpg'
  },
  {
    name: 'Handwash Refill', brand: 'Dettol', pack: '750 ml', price: 89, mrp: 99,
    category: 'needfuls', subcategory: 'daily', stock: 45, unit: 'per pouch',
    description: 'Original Dettol antibacterial liquid handwash refill pouch. Delivers 10X better germ defense than ordinary beauty soaps.',
    highlights: ['Trusted germ defense formula', 'Moisturizing formula keeps hands soft', 'Economical value refill pouch'],
    image: 'https://picsum.photos/seed/vrinda-ndf7/400/300.jpg'
  },
  {
    name: 'PureHands Sanitizer', brand: 'Himalaya', pack: '250 ml', price: 185, mrp: 200,
    category: 'needfuls', subcategory: 'daily', stock: 40, unit: 'per bottle',
    description: 'Herbal hand sanitizer with Coriander, Lime, and Neem extracts to eliminate germs on contact without drying out skin.',
    highlights: ['70% alcohol for instant germ kill', 'Enriched with Neem and Coriander', 'Non-sticky fast drying formula'],
    image: 'https://picsum.photos/seed/vrinda-ndf8/400/300.jpg'
  },

  // ── COMBOS (cross-category bundles) ──
  {
    name: 'Daily Immunity Kit', brand: 'Vrinda Curation', pack: '4 items', price: 499, mrp: 620,
    category: 'combos', subcategory: 'wellness', tag: 'Bestseller', stock: 15, unit: 'per bundle',
    description: 'Carefully curated seasonal bundle featuring Chyawanprash, Pure Ashwagandha, Green Tea, and Vitamin C supplements to strengthen whole family defenses.',
    highlights: ['Complete 360° immune defense', 'Saves ₹121 compared to individual purchase', 'Verified genuine pharmacy brands'],
    image: 'https://picsum.photos/seed/immunity-kit-combo/400/300.jpg'
  },
  {
    name: 'Glow Skincare Routine', brand: 'Vrinda Curation', pack: '4 items', price: 1299, mrp: 1750,
    category: 'combos', subcategory: 'wellness', tag: 'New', stock: 12, unit: 'per bundle',
    description: 'Dermatologist backed full regimen: Gentle cleanser, Vitamin C brightening serum, hydrating lotion, and antioxidant facial wipes for radiant healthy skin.',
    highlights: ['Step-by-step 4-part skincare routine', 'Best-selling serums and moisturizers bundled', 'Saves ₹451 instantly'],
    image: 'https://picsum.photos/seed/skincare-routine-combo/400/300.jpg'
  },
  {
    name: 'Healthy Snack Box', brand: 'Vrinda Curation', pack: '6 items', price: 599, mrp: 780,
    category: 'combos', subcategory: 'wellness', stock: 20, unit: 'per bundle',
    description: 'High-protein guilt-free treats bundle: High protein roasted makhana, chana masala, whole almonds, cashews, and energy date bars for daily office snacking.',
    highlights: ['Over 40g combined plant protein', 'All natural — zero added sugars or fried carbs', 'Saves ₹181 on retail MRP'],
    image: 'https://picsum.photos/seed/healthy-snack-box/400/300.jpg'
  },
  {
    name: 'New Baby Essentials Kit', brand: 'Vrinda Curation', pack: '4 items', price: 749, mrp: 920,
    category: 'combos', subcategory: 'wellness', stock: 18, unit: 'per bundle',
    description: 'New parent relief kit featuring breathable diaper pants, ultra-gentle herbal baby wipes, and tear-free antiseptic daily protection.',
    highlights: ['Essential newborn care in one box', 'Gentle pediatrician-tested items', 'Saves ₹171 with complimentary Mumbai express delivery'],
    image: 'https://picsum.photos/seed/baby-care-essentials/400/300.jpg'
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Review = require('./models/Review');
  const User = require('./models/User');

  await Product.deleteMany({});
  await Review.deleteMany({});
  const inserted = await Product.insertMany(products);
  console.log(`✅ Seeded ${inserted.length} rich products with stock & full specifications!`);

  // Map products by name
  const pMap = {};
  inserted.forEach(p => { pMap[p.name] = p; });

  // Wire combo bundles
  if (pMap['Daily Immunity Kit']) {
    const bItems = [];
    if (pMap['Dabur Chyawanprash']) bItems.push({ productId: pMap['Dabur Chyawanprash']._id, qty: 1 });
    if (pMap['Himalaya Ashwagandha']) bItems.push({ productId: pMap['Himalaya Ashwagandha']._id, qty: 1 });
    if (pMap['Zincovit Multivitamin']) bItems.push({ productId: pMap['Zincovit Multivitamin']._id, qty: 1 });
    await Product.findByIdAndUpdate(pMap['Daily Immunity Kit']._id, { bundleItems: bItems });
  }

  if (pMap['Glow Skincare Routine']) {
    const bItems = [];
    if (pMap['Gentle Skin Cleanser']) bItems.push({ productId: pMap['Gentle Skin Cleanser']._id, qty: 1 });
    if (pMap['Vitamin C Face Serum']) bItems.push({ productId: pMap['Vitamin C Face Serum']._id, qty: 1 });
    if (pMap['Soft Moisturising Cream']) bItems.push({ productId: pMap['Soft Moisturising Cream']._id, qty: 1 });
    await Product.findByIdAndUpdate(pMap['Glow Skincare Routine']._id, { bundleItems: bItems });
  }

  if (pMap['Healthy Snack Box']) {
    const bItems = [];
    if (pMap['California Almonds']) bItems.push({ productId: pMap['California Almonds']._id, qty: 1 });
    if (pMap['Roasted Chana Masala']) bItems.push({ productId: pMap['Roasted Chana Masala']._id, qty: 1 });
    if (pMap['Dates & Nuts Energy Bar']) bItems.push({ productId: pMap['Dates & Nuts Energy Bar']._id, qty: 2 });
    await Product.findByIdAndUpdate(pMap['Healthy Snack Box']._id, { bundleItems: bItems });
  }

  if (pMap['New Baby Essentials Kit']) {
    const bItems = [];
    if (pMap['Pants Diapers — M']) bItems.push({ productId: pMap['Pants Diapers — M']._id, qty: 1 });
    if (pMap['Gentle Baby Wipes']) bItems.push({ productId: pMap['Gentle Baby Wipes']._id, qty: 1 });
    if (pMap['PureHands Sanitizer']) bItems.push({ productId: pMap['PureHands Sanitizer']._id, qty: 1 });
    await Product.findByIdAndUpdate(pMap['New Baby Essentials Kit']._id, { bundleItems: bItems });
  }

  // Seed sample reviews for top products
  const customer = await User.findOne({ role: 'customer' });
  const custId = customer ? customer._id : new mongoose.Types.ObjectId();
  const custName = customer ? customer.name : 'Priya Sharma';

  const sampleReviews = [
    {
      productName: 'Dolo 650 Tablet',
      rating: 5,
      comment: 'Essential medicine for headaches and fever. Prompt same-day delivery in Bandra with proper tamper-proof packing.',
      verifiedPurchase: true
    },
    {
      productName: 'Dabur Chyawanprash',
      rating: 5,
      comment: 'Genuine product with a good expiry date. My family uses it daily for immunity, especially in monsoon.',
      verifiedPurchase: true
    },
    {
      productName: 'Gentle Skin Cleanser',
      rating: 5,
      comment: 'Best dermatologist-approved cleanser for sensitive skin. Does not dry out skin at all!',
      verifiedPurchase: true
    },
    {
      productName: 'Vitamin C Face Serum',
      rating: 4,
      comment: 'Noticed a subtle glow within 2 weeks of regular night use. Light texture and non-sticky.',
      verifiedPurchase: true
    },
    {
      productName: 'Daily Immunity Kit',
      rating: 5,
      comment: 'Amazing value combo! All 3 items are authentic brands and buying together saved more than ₹120.',
      verifiedPurchase: true
    }
  ];

  for (const sr of sampleReviews) {
    const prod = pMap[sr.productName];
    if (prod) {
      await Review.create({
        productId: prod._id,
        userId: custId,
        userName: custName,
        rating: sr.rating,
        comment: sr.comment,
        verifiedPurchase: sr.verifiedPurchase,
      });
      await Product.findByIdAndUpdate(prod._id, {
        averageRating: sr.rating,
        reviewCount: 1,
      });
    }
  }

  console.log('✅ Wired combo bundles & seeded authentic customer reviews!');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });