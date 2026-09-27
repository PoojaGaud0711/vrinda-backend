require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const products = [
  // ── MEDICINES ──
  { name:'Azithral 500 Tablet', brand:'Alembic', pack:'5 tablets', price:120, mrp:132, category:'medicines', subcategory:'prescription', requiresPrescription:true, image:'https://picsum.photos/seed/vrinda-med1/400/300.jpg' },
  { name:'Telma 40 Tablet', brand:'Glenmark', pack:'10 tablets', price:148, mrp:160, category:'medicines', subcategory:'prescription', requiresPrescription:true, image:'https://picsum.photos/seed/vrinda-med2/400/300.jpg' },
  { name:'Dolo 650 Tablet', brand:'Micro Labs', pack:'15 tablets', price:31, mrp:34, category:'medicines', subcategory:'otc', image:'https://picsum.photos/seed/vrinda-med3/400/300.jpg' },
  { name:'Digene Gel — Mint', brand:'Abbott', pack:'200 ml', price:120, mrp:135, category:'medicines', subcategory:'otc', image:'https://picsum.photos/seed/vrinda-med4/400/300.jpg' },
  { name:'Dabur Chyawanprash', brand:'Dabur', pack:'1 kg', price:390, mrp:415, category:'medicines', subcategory:'ayurvedic', tag:'Bestseller', image:'https://picsum.photos/seed/vrinda-med5/400/300.jpg' },
  { name:'Himalaya Ashwagandha', brand:'Himalaya', pack:'60 tablets', price:210, mrp:230, category:'medicines', subcategory:'ayurvedic', image:'https://picsum.photos/seed/vrinda-med6/400/300.jpg' },
  { name:'Fish Oil Omega-3', brand:'MuscleBlaze', pack:'60 capsules', price:549, mrp:699, category:'medicines', subcategory:'supplements', tag:'Bestseller', image:'https://picsum.photos/seed/vrinda-med7/400/300.jpg' },
  { name:'Zincovit Multivitamin', brand:'Apex Labs', pack:'15 tablets', price:105, mrp:115, category:'medicines', subcategory:'supplements', image:'https://picsum.photos/seed/vrinda-med8/400/300.jpg' },

  // ── BEAUTY ──
  { name:'Gentle Skin Cleanser', brand:'Cetaphil', pack:'125 ml', price:385, mrp:420, category:'beauty', subcategory:'skincare', tag:'Bestseller', image:'https://picsum.photos/seed/vrinda-bty1/400/300.jpg' },
  { name:'Vitamin C Face Serum', brand:'Minimalist', pack:'30 ml', price:599, mrp:699, category:'beauty', subcategory:'skincare', tag:'New', image:'https://picsum.photos/seed/vrinda-bty2/400/300.jpg' },
  { name:'Anti-Hair Fall Oil', brand:'Himalaya', pack:'200 ml', price:185, mrp:200, category:'beauty', subcategory:'haircare', image:'https://picsum.photos/seed/vrinda-bty3/400/300.jpg' },
  { name:'Onion Hair Oil', brand:'Mamaearth', pack:'150 ml', price:349, mrp:399, category:'beauty', subcategory:'haircare', image:'https://picsum.photos/seed/vrinda-bty4/400/300.jpg' },
  { name:'Soft Moisturising Cream', brand:'Nivea', pack:'300 ml', price:285, mrp:310, category:'beauty', subcategory:'bodycare', image:'https://picsum.photos/seed/vrinda-bty5/400/300.jpg' },
  { name:'Moisturising Lotion', brand:'Cetaphil', pack:'100 ml', price:325, mrp:350, category:'beauty', subcategory:'bodycare', image:'https://picsum.photos/seed/vrinda-bty6/400/300.jpg' },
  { name:'Men Face Wash', brand:'Nivea', pack:'100 ml', price:190, mrp:210, category:'beauty', subcategory:'grooming', image:'https://picsum.photos/seed/vrinda-bty7/400/300.jpg' },
  { name:'Beard & Mustache Oil', brand:'Beardo', pack:'50 ml', price:349, mrp:499, category:'beauty', subcategory:'grooming', image:'https://picsum.photos/seed/vrinda-bty8/400/300.jpg' },

  // ── SNACKS ──
  { name:'High Protein Makhana', brand:'MuscleBlaze', pack:'50 g', price:249, mrp:299, category:'snacks', subcategory:'protein', image:'https://picsum.photos/seed/vrinda-snk1/400/300.jpg' },
  { name:'Roasted Chana Masala', brand:'Nutraj', pack:'200 g', price:149, mrp:175, category:'snacks', subcategory:'protein', image:'https://picsum.photos/seed/vrinda-snk2/400/300.jpg' },
  { name:'California Almonds', brand:'Nutraj', pack:'500 g', price:549, mrp:649, category:'snacks', subcategory:'dryfruits', tag:'Bestseller', image:'https://picsum.photos/seed/vrinda-snk3/400/300.jpg' },
  { name:'Cashew Nuts W320', brand:'Nutraj', pack:'500 g', price:625, mrp:699, category:'snacks', subcategory:'dryfruits', image:'https://picsum.photos/seed/vrinda-snk4/400/300.jpg' },
  { name:'Green Tea Bags', brand:'Organic India', pack:'25 bags', price:220, mrp:240, category:'snacks', subcategory:'teas', image:'https://picsum.photos/seed/vrinda-snk5/400/300.jpg' },
  { name:'Tulsi Ginger Tea', brand:'Organic India', pack:'25 bags', price:230, mrp:250, category:'snacks', subcategory:'teas', image:'https://picsum.photos/seed/vrinda-snk6/400/300.jpg' },
  { name:'Granola Bars', brand:'Nature Valley', pack:'2 × 42 g', price:275, mrp:300, category:'snacks', subcategory:'bars', image:'https://picsum.photos/seed/vrinda-snk7/400/300.jpg' },
  { name:'Dates & Nuts Energy Bar', brand:'Yoga Bar', pack:'40 g', price:99, mrp:120, category:'snacks', subcategory:'bars', tag:'New', image:'https://picsum.photos/seed/vrinda-snk8/400/300.jpg' },

  // ── NEEDFULS ──
  { name:'Pants Diapers — M', brand:'MamyPoko', pack:'62 pants', price:749, mrp:899, category:'needfuls', subcategory:'baby', tag:'Bestseller', image:'https://picsum.photos/seed/vrinda-ndf1/400/300.jpg' },
  { name:'Gentle Baby Wipes', brand:'Himalaya', pack:'72 wipes', price:185, mrp:199, category:'needfuls', subcategory:'baby', image:'https://picsum.photos/seed/vrinda-ndf2/400/300.jpg' },
  { name:'Ultra Clean XL Pads', brand:'Whisper', pack:'30 pads', price:319, mrp:359, category:'needfuls', subcategory:'feminine', image:'https://picsum.photos/seed/vrinda-ndf3/400/300.jpg' },
  { name:'V Wash Plus', brand:'V-Wash', pack:'100 ml', price:195, mrp:215, category:'needfuls', subcategory:'feminine', image:'https://picsum.photos/seed/vrinda-ndf4/400/300.jpg' },
  { name:'Facial Tissues', brand:'Origami', pack:'100 pulls', price:99, mrp:110, category:'needfuls', subcategory:'napkins', image:'https://picsum.photos/seed/vrinda-ndf5/400/300.jpg' },
  { name:'Antibacterial Wipes', brand:'Dettol', pack:'40 wipes', price:75, mrp:85, category:'needfuls', subcategory:'napkins', image:'https://picsum.photos/seed/vrinda-ndf6/400/300.jpg' },
  { name:'Handwash Refill', brand:'Dettol', pack:'750 ml', price:89, mrp:99, category:'needfuls', subcategory:'daily', image:'https://picsum.photos/seed/vrinda-ndf7/400/300.jpg' },
  { name:'PureHands Sanitizer', brand:'Himalaya', pack:'250 ml', price:185, mrp:200, category:'needfuls', subcategory:'daily', image:'https://picsum.photos/seed/vrinda-ndf8/400/300.jpg' },

  // ── COMBOS (cross-category bundles) ──
  { name:'Daily Immunity Kit', brand:'Vrinda Curation', pack:'4 items', price:499, mrp:620, category:'combos', subcategory:'wellness', tag:'Bestseller', image:'https://picsum.photos/seed/immunity-kit-combo/400/300.jpg' },
  { name:'Glow Skincare Routine', brand:'Vrinda Curation', pack:'4 items', price:1299, mrp:1750, category:'combos', subcategory:'wellness', tag:'New', image:'https://picsum.photos/seed/skincare-routine-combo/400/300.jpg' },
  { name:'Healthy Snack Box', brand:'Vrinda Curation', pack:'6 items', price:599, mrp:780, category:'combos', subcategory:'wellness', image:'https://picsum.photos/seed/healthy-snack-box/400/300.jpg' },
  { name:'New Baby Essentials Kit', brand:'Vrinda Curation', pack:'4 items', price:749, mrp:920, category:'combos', subcategory:'wellness', image:'https://picsum.photos/seed/baby-care-essentials/400/300.jpg' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Product.deleteMany({});          // wipes ALL products — clean slate
  const inserted = await Product.insertMany(products);
  console.log(`✅ Seeded ${inserted.length} products (including 4 combos)`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });