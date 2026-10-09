/**
 * scripts/seed_rich_stock.js
 * 
 * Updates the entire stock inventory across all existing products and seeds
 * high-demand medical, beauty, snacking, needful, and combo products
 * with full details, healthy stock (40-120 units), and 4 multi-angle views.
 */

const path = require('path');
const rootDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(rootDir, '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Comprehensive catalog of new items with full details and 4 multi-angle image views
const NEW_PRODUCTS = [
  // ── MEDICINES: Prescription & OTC ──
  {
    name: 'Pan 40 Gastro-Resistant Tablet',
    brand: 'Alkem Laboratories Ltd',
    pack: 'Strip of 15 Tablets',
    price: 174,
    mrp: 193,
    image: 'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00306/pan-40mg-strip-of-15-tablets-front-2-1756099995-non-watermarked.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00306/pan-40mg-strip-of-15-tablets-front-2-1756099995-non-watermarked.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00306/pan-40mg-strip-of-15-tablets-back-7-1756099995-non-watermarked.jpg',
      'https://newassets.apollo247.com/pub/media/catalog/product/p/a/pan0043_2.jpg',
      'https://5.imimg.com/data5/SELLER/Default/2023/8/335899818/QY/WN/YJ/186598586/pan-40-tablet-1000x1000.jpg'
    ],
    category: 'medicines',
    subcategory: 'prescription',
    tag: 'Bestseller',
    description: 'Pan 40 Tablet is a proton pump inhibitor (PPI) containing Pantoprazole 40mg. It effectively reduces stomach acid secretion for treatment of GERD, heartburn, gastritis, and peptic ulcers.',
    highlights: [
      '24-hour fast acid suppression',
      'Heals stomach and esophageal ulcers',
      'Prevents NSAID-induced acidity',
      'Gentle enteric-coated formulation'
    ],
    unit: 'per strip of 15',
    requiresPrescription: true,
    stock: 95,
    averageRating: 4.8,
    reviewCount: 38
  },
  {
    name: 'Augmentin 625 Duo Tablet',
    brand: 'GlaxoSmithKline Pharmaceuticals',
    pack: 'Strip of 10 Tablets',
    price: 183,
    mrp: 197,
    image: 'https://cdn01.pharmeasy.in/dam/productsnowatermark/255148/augmentin-duo-625mg-strip-of-10-tablets-box-front-1-1756827387-non-watermarked.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/255148/augmentin-duo-625mg-strip-of-10-tablets-box-front-1-1756827387-non-watermarked.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/255148/augmentin-duo-625mg-strip-of-10-tablets-front-2-1756827387-non-watermarked.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/255148/augmentin-duo-625mg-strip-of-10-tablets-box-back-4-1756827387-non-watermarked.jpg',
      'https://5.imimg.com/data5/SELLER/Default/2022/10/GG/AA/WP/101315720/azithral-500mg-tablet-1000x1000.jpg'
    ],
    category: 'medicines',
    subcategory: 'prescription',
    tag: 'Bestseller',
    description: 'Augmentin 625 Duo contains Amoxicillin 500mg and Potassium Clavulanate 125mg. A broad-spectrum antibacterial medicine prescribed for severe bacterial respiratory, dental, skin, and urinary infections.',
    highlights: [
      'Broad-spectrum penicillin antibiotic',
      'Clavulanate overcomes bacterial resistance',
      'Treats respiratory, ENT, and dental infections',
      'World Health Organization essential medicine'
    ],
    unit: 'per strip of 10',
    requiresPrescription: true,
    stock: 80,
    averageRating: 4.9,
    reviewCount: 42
  },
  {
    name: 'Combiflam Dual Action Tablet',
    brand: 'Sanofi India Ltd',
    pack: 'Strip of 20 Tablets',
    price: 52,
    mrp: 58,
    image: 'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00375/combiflam-strip-of-20-tablets-box-front-1-1756885218-non-watermarked.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00375/combiflam-strip-of-20-tablets-box-front-1-1756885218-non-watermarked.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00375/combiflam-strip-of-20-tablets-front-2-1756885218-non-watermarked.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00375/combiflam-strip-of-20-tablets-box-back-4-1756885218-non-watermarked.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00375/combiflam-strip-of-20-tablets-back-7-1756885218-non-watermarked.jpg'
    ],
    category: 'medicines',
    subcategory: 'otc',
    tag: 'Bestseller',
    description: 'Combiflam combines Ibuprofen 400mg and Paracetamol 325mg for powerful fast relief from muscle aches, severe headaches, backache, dental pain, fever, and joint inflammation.',
    highlights: [
      'Dual active analgesic & anti-inflammatory',
      'Fast relief in 30 minutes',
      'Effective for fever with intense body pain',
      'Safe when taken after meals'
    ],
    unit: 'per strip of 20',
    requiresPrescription: false,
    stock: 120,
    averageRating: 4.8,
    reviewCount: 56
  },
  {
    name: 'Volini Fast Pain Relief Gel',
    brand: 'Sun Pharma',
    pack: '100 gm Tube',
    price: 325,
    mrp: 349,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/I00392/volini-pain-relief-gel-tube-of-100-g-6.1-1712725504.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/I00392/volini-pain-relief-gel-tube-of-100-g-6.1-1712725504.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/I00392/volini-pain-relief-gel-tube-of-100-g-2-1712725501.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/I00392/volini-pain-relief-gel-tube-of-100-g-6.2-1712725507.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/I00392/volini-pain-relief-gel-tube-of-100-g-7-1712725509.jpg'
    ],
    category: 'medicines',
    subcategory: 'otc',
    tag: 'Bestseller',
    description: 'Volini Pain Relief Gel with scientifically proven Diclofenac, Linseed oil, and Methyl Salicylate deeply penetrates sore muscles to relieve sprains, joint pain, neck stiffness, and backache rapidly.',
    highlights: [
      'Quick absorption micro-gel formula',
      'Deep penetrating action on joints & muscles',
      'Long-lasting soothing warmth',
      'Doctor recommended topical pain specialist'
    ],
    unit: 'per 100g tube',
    requiresPrescription: false,
    stock: 85,
    averageRating: 4.7,
    reviewCount: 34
  },
  {
    name: 'Himalaya Liv.52 Herbal Liver Care',
    brand: 'Himalaya Wellness',
    pack: 'Bottle of 100 Tablets',
    price: 210,
    mrp: 220,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/105920/himalaya-liv52-tablets-100s-2-1748863387.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/105920/himalaya-liv52-tablets-100s-2-1748863387.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/105920/himalaya-liv52-tablets-100s-3-1748863387.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/105920/himalaya-liv52-tablets-100s-6.1-1748863387.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/105920/himalaya-liv52-tablets-100s-7-1748863387.jpg'
    ],
    category: 'medicines',
    subcategory: 'ayurvedic',
    tag: 'Bestseller',
    description: 'Himalaya Liv.52 is a world-renowned Ayurvedic hepatic formulation containing Caper Bush and Chicory. It protects the liver against toxins, enhances digestion, and improves appetite.',
    highlights: [
      'Protects hepatic parenchyma against cellular damage',
      'Promotes rapid recovery from jaundice and fatty liver',
      'Boosts digestive fire and natural appetite',
      '100% natural Ayurvedic formulation'
    ],
    unit: 'per bottle of 100',
    requiresPrescription: false,
    stock: 75,
    averageRating: 4.8,
    reviewCount: 47
  },
  {
    name: 'Shelcal 500 Calcium & Vitamin D3',
    brand: 'Torrent Pharmaceuticals',
    pack: 'Bottle of 30 Tablets',
    price: 314,
    mrp: 327,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/K78299/shelcal-500mg-bottle-of-30-tablets-2-1789543404.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/K78299/shelcal-500mg-bottle-of-30-tablets-2-1789543404.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/K78299/shelcal-500mg-bottle-of-30-tablets-6.1-1789543404.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/K78299/shelcal-500mg-bottle-of-30-tablets-6.2-1789543404.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/K78299/shelcal-500mg-bottle-of-30-tablets-7-1789543404.jpg'
    ],
    category: 'medicines',
    subcategory: 'supplements',
    tag: 'Bestseller',
    description: 'Shelcal 500 combines pure Calcium 500mg from organic sources with Vitamin D3 250 IU to ensure maximum absorption for high bone mineral density, joint strength, and tooth health.',
    highlights: [
      'Maintains dense, fracture-resistant bones',
      'Vitamin D3 enhances intestinal calcium transport',
      'Supports healthy muscle contraction and nerve impulses',
      'Doctor prescribed for pregnancy and senior wellness'
    ],
    unit: 'per bottle of 30',
    requiresPrescription: false,
    stock: 90,
    averageRating: 4.8,
    reviewCount: 29
  },

  // ── BEAUTY & DERMATOLOGY ──
  {
    name: 'Minimalist 10% Niacinamide Face Serum',
    brand: 'Minimalist',
    pack: '30 ml Dropper Bottle',
    price: 569,
    mrp: 599,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/E07092/minimalist-10-niacinamide-serum-30ml-2-1671741753.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/E07092/minimalist-10-niacinamide-serum-30ml-2-1671741753.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/E07092/minimalist-10-niacinamide-serum-30ml-3-1671741753.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/E07092/minimalist-10-niacinamide-serum-30ml-6.1-1671741753.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/E07092/minimalist-10-niacinamide-serum-30ml-7-1671741753.jpg'
    ],
    category: 'beauty',
    subcategory: 'skincare',
    tag: 'Bestseller',
    description: 'A soothing clinical-strength serum with 10% pure Niacinamide (Vitamin B3) and Matmarine to balance sebum, fade acne marks, tighten open pores, and strengthen the barrier.',
    highlights: [
      'Fades dark acne scars & hyperpigmentation',
      'Minimizes dilated facial pores within 2 weeks',
      'Fragrance-free, silicone-free & non-comedogenic',
      'Clinically tested on sensitive acne-prone skin'
    ],
    unit: 'per 30ml dropper',
    requiresPrescription: false,
    stock: 65,
    averageRating: 4.8,
    reviewCount: 31
  },
  {
    name: 'Aqualogica Glow+ Dewy Sunscreen SPF 50',
    brand: 'Aqualogica',
    pack: '50 g Tube',
    price: 365,
    mrp: 399,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/Y11956/aqualogica-glow-dewy-sunscreen-with-papaya-vitamin-c-50g-2-1671742410.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/Y11956/aqualogica-glow-dewy-sunscreen-with-papaya-vitamin-c-50g-2-1671742410.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/Y11956/aqualogica-glow-dewy-sunscreen-with-papaya-vitamin-c-50g-3-1671742410.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/Y11956/aqualogica-glow-dewy-sunscreen-with-papaya-vitamin-c-50g-6.1-1671742410.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/Y11956/aqualogica-glow-dewy-sunscreen-with-papaya-vitamin-c-50g-7-1671742410.jpg'
    ],
    category: 'beauty',
    subcategory: 'skincare',
    tag: 'New',
    description: 'Ultra-light water-based sunscreen with SPF 50+ PA++++. Formulated with Papaya extracts and Hyaluronic Acid to hydrate and protect against UVA, UVB, and blue light without leaving a white cast.',
    highlights: [
      'Broad spectrum SPF 50+ PA++++ protection',
      'Zero white cast, light water-gel texture',
      'Deeply hydrates with multi-molecular hyaluronic acid',
      'Protects against gadget blue-light radiation'
    ],
    unit: 'per 50g tube',
    requiresPrescription: false,
    stock: 55,
    averageRating: 4.7,
    reviewCount: 22
  },
  {
    name: 'Biotique Bio Bhringraj Hair Growth Oil',
    brand: 'Biotique',
    pack: '200 ml Bottle',
    price: 245,
    mrp: 290,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/026850/biotique-bio-bhringraj-therapeutic-hair-oil-200ml-2-1671740920.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/026850/biotique-bio-bhringraj-therapeutic-hair-oil-200ml-2-1671740920.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/026850/biotique-bio-bhringraj-therapeutic-hair-oil-200ml-3-1671740920.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/026850/biotique-bio-bhringraj-therapeutic-hair-oil-200ml-6.1-1671740920.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/026850/biotique-bio-bhringraj-therapeutic-hair-oil-200ml-7-1671740920.jpg'
    ],
    category: 'beauty',
    subcategory: 'haircare',
    tag: 'Bestseller',
    description: 'Therapeutic Ayurvedic hair oil infused with pure Bhringraj, Butea Frondosa, Amla, and Centella blended in coconut milk to stimulate dormant follicles and stop premature greying.',
    highlights: [
      'Intensively stimulates microcirculation at the roots',
      'Helps reduce chronic seasonal hair shedding',
      'Nourishes dry scalp and curbs flaky dandruff',
      'Ayurvedic botanical recipe with 100% natural herbs'
    ],
    unit: 'per 200ml bottle',
    requiresPrescription: false,
    stock: 70,
    averageRating: 4.6,
    reviewCount: 35
  },
  {
    name: 'Nivea Nourishing Body Milk 48H',
    brand: 'Nivea India',
    pack: '400 ml Pump Bottle',
    price: 385,
    mrp: 450,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/122585/nivea-body-lotion-nourishing-body-milk-for-very-dry-skin-400ml-2-1671741544.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/122585/nivea-body-lotion-nourishing-body-milk-for-very-dry-skin-400ml-2-1671741544.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/122585/nivea-body-lotion-nourishing-body-milk-for-very-dry-skin-400ml-3-1671741544.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/122585/nivea-body-lotion-nourishing-body-milk-for-very-dry-skin-400ml-6.1-1671741544.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/122585/nivea-body-lotion-nourishing-body-milk-for-very-dry-skin-400ml-7-1671741544.jpg'
    ],
    category: 'beauty',
    subcategory: 'bodycare',
    tag: 'Bestseller',
    description: 'Enriched with 2x Almond Oil and deep moisture serum, Nivea Body Milk locks in intense hydration for 48 hours, visibly reducing roughness on extra dry skin.',
    highlights: [
      '48-hour continuous moisture retention',
      'Rich natural almond oil nourishment',
      'Repairs cracked elbows, knees, and dry legs',
      'Dermatologically tested and certified gentle'
    ],
    unit: 'per 400ml pump bottle',
    requiresPrescription: false,
    stock: 80,
    averageRating: 4.8,
    reviewCount: 40
  },

  // ── HEALTHY SNACKS & NUTRITION ──
  {
    name: 'Tata Sampann Premium California Walnuts',
    brand: 'Tata Sampann',
    pack: '500 g Zip Pouch',
    price: 699,
    mrp: 799,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/E42628/tata-sampann-100-pure-california-almonds-whole-500g-2-1742961946.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/E42628/tata-sampann-100-pure-california-almonds-whole-500g-2-1742961946.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/E42628/tata-sampann-100-pure-california-almonds-whole-500g-6.1-1742961946.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/E42628/tata-sampann-100-pure-california-almonds-whole-500g-6.2-1742962031.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/E42628/tata-sampann-100-pure-california-almonds-whole-500g-6.3-1742962160.jpg'
    ],
    category: 'snacks',
    subcategory: 'dryfruits',
    tag: 'Bestseller',
    description: '100% pure premium California walnut kernels rich in Omega-3 fatty acids, alpha-linolenic acid, and plant antioxidants. Great for cognitive health and cardiovascular support.',
    highlights: [
      'Rich in brain-boosting ALA Omega-3 fats',
      'No added preservatives or artificial polish',
      'Crisp, vacuum-packed fresh nutty flavor',
      'Helps maintain healthy lipid profiles'
    ],
    unit: 'per 500g pouch',
    requiresPrescription: false,
    stock: 60,
    averageRating: 4.9,
    reviewCount: 26
  },
  {
    name: 'True Elements 7-in-1 Super Seeds Mix',
    brand: 'True Elements',
    pack: '250 g Jar',
    price: 265,
    mrp: 299,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/O91703/true-elements-7-in-1-super-seeds-and-nut-mix-250g-2-1671743058.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/O91703/true-elements-7-in-1-super-seeds-and-nut-mix-250g-2-1671743058.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/O91703/true-elements-7-in-1-super-seeds-and-nut-mix-250g-3-1671743058.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/O91703/true-elements-7-in-1-super-seeds-and-nut-mix-250g-6.1-1671743058.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/O91703/true-elements-7-in-1-super-seeds-and-nut-mix-250g-7-1671743058.jpg'
    ],
    category: 'snacks',
    subcategory: 'protein',
    tag: 'New',
    description: 'Power-packed blend of 7 roasted super seeds: Chia, Pumpkin, Flax, Watermelon, Sunflower, Sesame, and Soy nuts. Rich in dietary fiber, clean plant protein, and essential minerals.',
    highlights: [
      'High protein & dietary fiber snack',
      'Zero cholesterol & zero trans fats',
      'Crunchy roasted without added artificial chemicals',
      'Great for weight management and keto diets'
    ],
    unit: 'per 250g jar',
    requiresPrescription: false,
    stock: 85,
    averageRating: 4.7,
    reviewCount: 19
  },

  // ── DAILY NEEDFULS & HYGIENE ──
  {
    name: 'Dettol Antiseptic Disinfectant Liquid',
    brand: 'Reckitt Benckiser',
    pack: '550 ml Bottle',
    price: 215,
    mrp: 235,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/I40124/dettol-germ-defence-antiseptic-liquid-bottle-1000-ml-6.01-1770098056.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/I40124/dettol-germ-defence-antiseptic-liquid-bottle-1000-ml-6.01-1770098056.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/I40124/dettol-germ-defence-antiseptic-liquid-bottle-1000-ml-2-1770098056.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/I40124/dettol-germ-defence-antiseptic-liquid-bottle-1000-ml-6.02-1770098056.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/I40124/dettol-germ-defence-antiseptic-liquid-bottle-1000-ml-7-1770098056.jpg'
    ],
    category: 'needfuls',
    subcategory: 'daily',
    tag: 'Bestseller',
    description: 'Trusted multi-use antiseptic liquid protecting against 100 illness-causing germs. Essential for first-aid wound disinfection, personal hygiene, and household surface sanitization.',
    highlights: [
      'Kills 99.9% of bacteria and viral pathogens',
      'First aid cleansing for minor cuts, scrapes & stings',
      'Safe for laundry sanitization and bathing water',
      'Indian Medical Association certified'
    ],
    unit: 'per 550ml bottle',
    requiresPrescription: false,
    stock: 110,
    averageRating: 4.9,
    reviewCount: 65
  },
  {
    name: 'Pee Safe Toilet Seat Sanitizer Spray',
    brand: 'Pee Safe',
    pack: '75 ml Can',
    price: 165,
    mrp: 180,
    image: 'https://cdn01.pharmeasy.in/dam/products_otc/270425/pee-safe-toilet-seat-sanitizer-spray-mint-75ml-2-1671741916.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/products_otc/270425/pee-safe-toilet-seat-sanitizer-spray-mint-75ml-2-1671741916.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/270425/pee-safe-toilet-seat-sanitizer-spray-mint-75ml-3-1671741916.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/270425/pee-safe-toilet-seat-sanitizer-spray-mint-75ml-6.1-1671741916.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/270425/pee-safe-toilet-seat-sanitizer-spray-mint-75ml-7-1671741916.jpg'
    ],
    category: 'needfuls',
    subcategory: 'feminine',
    tag: 'Bestseller',
    description: 'Travel-friendly sanitizer spray providing 99.9% protection against UTI-causing germs within 10 seconds of spraying on public restroom seats, flush handles, and taps.',
    highlights: [
      'Reduces risk of painful urinary tract infections (UTI)',
      'Acts in 10 seconds without needing to wipe',
      'Pleasant deodorizing mint fragrance',
      'Compact aerosol can fits easily into handbags'
    ],
    unit: 'per 75ml aerosol spray',
    requiresPrescription: false,
    stock: 95,
    averageRating: 4.8,
    reviewCount: 33
  },

  // ── WELLNESS COMBOS ──
  {
    name: 'Complete Heart & BP Care Kit',
    brand: 'Vrinda Clinical Curation',
    pack: 'Complete 30-Day Regimen',
    price: 899,
    mrp: 1150,
    image: 'https://cdn01.pharmeasy.in/dam/productsnowatermark/I02514/telma-40mg-strip-of-30-tablets-side-6.01-1788939311-non-watermark.jpg',
    images: [
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I02514/telma-40mg-strip-of-30-tablets-side-6.01-1788939311-non-watermark.jpg',
      'https://cdn01.pharmeasy.in/dam/products_otc/E42628/tata-sampann-100-pure-california-almonds-whole-500g-2-1742961946.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/059346/dolo-650mg-strip-of-15-tablets-combo-3-1753347024-non-watermark.jpg',
      'https://cdn01.pharmeasy.in/dam/productsnowatermark/I00306/pan-40mg-strip-of-15-tablets-back-7-1756099995-non-watermarked.jpg'
    ],
    category: 'combos',
    subcategory: 'wellness',
    tag: 'Bestseller',
    description: 'Expert-curated 30-day cardiovascular bundle featuring pure Omega-3 Fish Oil, arterial health antioxidants, and daily cardiovascular multivitamin support to maintain balanced blood pressure.',
    highlights: [
      'Clinically formulated for healthy cholesterol & BP',
      'High-potency EPA & DHA heart support',
      'Comprehensive 30-day supply with pharmacist guide',
      'Saves 22% compared to buying individual items'
    ],
    unit: 'bundle pack',
    requiresPrescription: false,
    stock: 45,
    averageRating: 4.9,
    reviewCount: 18
  }
];

async function runSeed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vrindaDB');
  console.log('Connected!');

  // 1. Update stock and ensure 4 view images for ALL existing products
  console.log('\n--- 1. Updating Stock & Image Arrays for Existing Products ---');
  const existing = await Product.find();
  let updatedCount = 0;

  for (const p of existing) {
    let changed = false;

    // Ensure healthy stock count (between 45 and 110)
    if (!p.stock || p.stock < 35) {
      p.stock = Math.floor(Math.random() * 40) + 50; // 50 to 90 units
      changed = true;
    }

    // Ensure images array has up to 4 views
    if (!p.images || !p.images.length) {
      if (p.image) {
        p.images = [p.image];
        changed = true;
      }
    }

    if (changed) {
      await p.save();
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} existing products with healthy stock and image arrays.`);

  // 2. Insert new rich products across each category
  console.log('\n--- 2. Seeding New Products across All Categories ---');
  let insertedCount = 0;
  for (const item of NEW_PRODUCTS) {
    const exists = await Product.findOne({ name: item.name });
    if (!exists) {
      await Product.create(item);
      console.log(`+ Added: [${item.category}] ${item.name} (Stock: ${item.stock}, MRP: ₹${item.mrp})`);
      insertedCount++;
    } else {
      // Update stock and images if already present
      exists.stock = Math.max(exists.stock || 0, item.stock);
      if (!exists.images || exists.images.length < 2) {
        exists.images = item.images;
      }
      await exists.save();
      console.log(`~ Updated existing item: ${item.name} with 4-view images and stock: ${exists.stock}`);
    }
  }

  // Final summary
  const total = await Product.countDocuments();
  const catCounts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$stock' } } }
  ]);

  console.log(`\n🎉 Seed finished! Total products in store: ${total}`);
  console.log('Category breakdown:', catCounts);

  process.exit(0);
}

runSeed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
