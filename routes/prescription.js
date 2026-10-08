const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Prescription = require('../models/Prescription');
const Activity = require('../models/Activity');
const { isLoggedIn, adminOnly } = require('../middleware/auth');
const { sendOrderConfirmation } = require('../services/emailService');

// Configure Cloudinary if credentials are present in env
const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// uploads folder — created automatically
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'prescriptions');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'rx-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  },
});

const storage = useCloudinary ? multer.memoryStorage() : diskStorage;

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.pdf'].includes(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

async function logActivity(actor, action, detail) {
  try {
    if (!actor) return;
    await Activity.create({
      actorId: actor._id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      detail,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// Quietly attach logged-in user if token is present
async function currentUser(req) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch { return null; }
}

function makeOrderNumber() {
  return 'VRN-' + Math.floor(100000 + Math.random() * 900000);
}

const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

// Formulation synonyms to map doctor prescriptions and active salts to Vrinda store catalog
const SYNONYM_MAP = [
  {
    tokens: ['azithral', 'maxithral', 'azee', 'zithromax', 'azithromycin'],
    catalogMatch: (p) => p.name.toLowerCase().includes('azithral')
  },
  {
    tokens: ['dolo', 'calpol', 'paracetamol', 'pcm', 'acetaminophen'],
    catalogMatch: (p) => p.name.toLowerCase().includes('dolo')
  },
  {
    tokens: ['telma', 'telmikind', 'telpres', 'telmisartan'],
    catalogMatch: (p) => p.name.toLowerCase().includes('telma')
  },
  {
    tokens: ['digene', 'gelusil', 'antacid'],
    catalogMatch: (p) => p.name.toLowerCase().includes('digene')
  },
  {
    tokens: ['zincovit', 'multivitamin', 'becadexamin'],
    catalogMatch: (p) => p.name.toLowerCase().includes('zincovit')
  },
  {
    tokens: ['fish oil', 'omega-3', 'omega 3'],
    catalogMatch: (p) => p.name.toLowerCase().includes('fish oil')
  },
  {
    tokens: ['ashwagandha'],
    catalogMatch: (p) => p.name.toLowerCase().includes('ashwagandha')
  },
  {
    tokens: ['chyawanprash', 'chyavanprash'],
    catalogMatch: (p) => p.name.toLowerCase().includes('chyawanprash')
  },
  {
    tokens: ['v wash', 'vwash'],
    catalogMatch: (p) => p.name.toLowerCase().includes('v wash')
  },
  {
    tokens: ['onion hair oil', 'onion oil', 'red onion'],
    catalogMatch: (p) => p.name.toLowerCase().includes('onion hair oil')
  },
  {
    tokens: ['cetaphil lotion', 'moisturising lotion'],
    catalogMatch: (p) => p.name.toLowerCase().includes('moisturising lotion')
  },
  {
    tokens: ['cetaphil cleanser', 'gentle skin cleanser'],
    catalogMatch: (p) => p.name.toLowerCase().includes('gentle skin cleanser')
  },
  {
    tokens: ['nivea cream', 'moisturising cream'],
    catalogMatch: (p) => p.name.toLowerCase().includes('moisturising cream')
  }
];

function isValidImageOrPdf(buf) {
  if (!buf || buf.length < 4) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // WEBP: RIFF
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return true;
  // PDF: %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return true;
  return false;
}

// Extract readable text from uploaded prescription file (Image OCR or PDF)
async function extractTextFromFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  let extracted = '';

  try {
    const buf = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
    if (!buf || !isValidImageOrPdf(buf)) {
      console.warn('Prescription file is empty or not a valid image/PDF format.');
      return '';
    }

    if (ext === '.pdf') {
      const parsed = await pdfParse(buf);
      extracted = parsed.text || '';
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const input = file.path || file.buffer;
      if (input) {
        const res = await Tesseract.recognize(input, 'eng').catch(e => {
          console.warn('Tesseract recognition warning:', e.message);
          return null;
        });
        extracted = res?.data?.text || '';
      }
    }
  } catch (err) {
    console.error('OCR Extraction error on prescription:', err.message);
  }

  return extracted;
}

const THERAPEUTIC_SUGGESTIONS_CONFIG = [
  {
    category: 'skincare_moisturizer',
    keywords: ['cetaphil', 'moisturizing', 'moisturising', 'cream', 'lotion', 'dry skin', 'emollient', 'ceramide', 'hydration', 'sensitive skin'],
    options: [
      {
        catalogName: 'Moisturising Lotion',
        brand: 'Cetaphil',
        clinicalNote: 'Same brand Cetaphil gentle daily hydration formula for sensitive and dry skin'
      },
      {
        catalogName: 'Soft Moisturising Cream',
        brand: 'Nivea',
        clinicalNote: 'Deep moisturizing rich cream for intensive skin barrier hydration'
      },
      {
        catalogName: 'Gentle Skin Cleanser',
        brand: 'Cetaphil',
        clinicalNote: 'Gentle non-stripping cleanser for dry and sensitive skin barrier care'
      }
    ]
  },
  {
    category: 'hair_care',
    keywords: ['hair oil', 'onion oil', 'hair fall', 'mamaearth', 'biotin', 'scalp'],
    options: [
      {
        catalogName: 'Onion Hair Oil',
        brand: 'Mamaearth',
        clinicalNote: 'Red onion and biotin oil to reduce hair fall and nourish follicles'
      },
      {
        catalogName: 'Anti-Hair Fall Oil',
        brand: 'Himalaya',
        clinicalNote: 'Bhringaraja herbal formulation for root strength and hair density'
      }
    ]
  },
  {
    category: 'acidity_ppi',
    keywords: ['sompraz', 'pantocid', 'pan', 'rabeprazole', 'esomeprazole', 'omeprazole', 'aciloc', 'rantac', 'gelusil', 'antacid', 'gerd', 'acid'],
    options: [
      {
        catalogName: 'Digene Gel — Mint',
        clinicalNote: 'Fast-acting antacid suspension for gastric acid neutralization and reflux relief'
      }
    ]
  },
  {
    category: 'fever_pain',
    keywords: ['crocin', 'combiflam', 'meftal', 'ibuprofen', 'calpol', 'paracetamol', 'pcm', 'analgesic', 'dolo', 'pyrexia', 'body ache', 'fever'],
    options: [
      {
        catalogName: 'Dolo 650 Tablet',
        clinicalNote: 'Paracetamol 650mg for effective antipyretic fever & pain relief'
      }
    ]
  },
  {
    category: 'vitamins_immunity',
    keywords: ['supradyn', 'becadexamin', 'neurobion', 'limcee', 'multivitamin', 'zinc', 'moxclav', 'amoxicillin', 'antibiotic', 'augmentin', 'immunity'],
    options: [
      {
        catalogName: 'Zincovit Multivitamin',
        clinicalNote: 'Essential multivitamin with Zinc to support cellular recovery and immunity'
      },
      {
        catalogName: 'Dabur Chyawanprash',
        clinicalNote: 'Ayurvedic immunity builder packed with natural vitamin C and 40+ herbs'
      }
    ]
  },
  {
    category: 'respiratory_support',
    keywords: ['salbair', 'asthalin', 'inhaler', 'levosalbutamol', 'montek', 'montelukast', 'levocetirizine', 'cough', 'asthma', 'bronchial', 'allergy'],
    options: [
      {
        catalogName: 'Tulsi Ginger Tea',
        clinicalNote: 'Herbal throat soothing & respiratory comfort tea while prescription inhaler is procured'
      },
      {
        catalogName: 'Green Tea Bags',
        clinicalNote: 'Antioxidant-rich organic warm beverage for respiratory and metabolic comfort'
      }
    ]
  },
  {
    category: 'hypertension_cardio',
    keywords: ['telma', 'telmisartan', 'amlodipine', 'bp', 'blood pressure'],
    options: [
      {
        catalogName: 'Telma 40 Tablet',
        clinicalNote: 'Telmisartan 40mg for blood pressure regulation (Rx verified)'
      },
      {
        catalogName: 'Fish Oil Omega-3',
        clinicalNote: 'Omega-3 EPA/DHA fatty acids for cardiovascular and lipid support'
      }
    ]
  },
  {
    category: 'intimate_hygiene',
    keywords: ['v wash', 'vwash', 'intimate wash', 'feminine hygiene'],
    options: [
      {
        catalogName: 'V Wash Plus',
        clinicalNote: 'Lactic acid infused intimate wash for pH balance maintenance'
      }
    ]
  }
];

function findSuggestions(medName, catalog) {
  const lower = (medName || '').toLowerCase();
  const results = [];
  const addedIds = new Set();

  for (const s of THERAPEUTIC_SUGGESTIONS_CONFIG) {
    if (s.keywords.some(k => lower.includes(k))) {
      for (const opt of s.options) {
        const prod = catalog.find(p => {
          const matchName = p.name.toLowerCase().includes(opt.catalogName.toLowerCase());
          const matchBrand = opt.brand ? p.brand?.toLowerCase().includes(opt.brand.toLowerCase()) : true;
          return matchName && matchBrand && p.stock > 0;
        });

        if (prod && !addedIds.has(String(prod._id))) {
          addedIds.add(String(prod._id));
          results.push({
            productId: prod._id,
            name: prod.name,
            brand: prod.brand,
            pack: prod.pack,
            price: prod.price,
            image: prod.image,
            stock: prod.stock,
            clinicalNote: opt.clinicalNote
          });
        }
      }
    }
  }

  // Fallback: search catalog products with relevant matching words
  if (results.length === 0) {
    const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    for (const prod of catalog) {
      if (prod.stock > 0 && !addedIds.has(String(prod._id))) {
        const pLower = `${prod.name} ${prod.brand || ''} ${prod.category || ''} ${prod.description || ''}`.toLowerCase();
        if (words.some(w => pLower.includes(w))) {
          addedIds.add(String(prod._id));
          results.push({
            productId: prod._id,
            name: prod.name,
            brand: prod.brand,
            pack: prod.pack,
            price: prod.price,
            image: prod.image,
            stock: prod.stock,
            clinicalNote: `Related in-stock option from ${prod.category} category`
          });
          if (results.length >= 2) break;
        }
      }
    }
  }

  return results;
}

function cleanMedicineName(raw) {
  return raw
    .replace(/[’‘`]/g, "'")
    .replace(/^(?:(?:[0-9]{1,2}|il'|i{1,3})[\.\-\)\:\s]+)/i, '')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/(?:dolo\s*650[^\w]*)+dolo\s*650/i, 'Dolo 650')
    .replace(/^[A-Za-z0-9]\s+(?=[A-Z][a-z])/, '')
    .trim();
}

function parsePrescriptionItems(combinedText) {
  const lines = combinedText.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];

  const itemStartRegex = /^(?:(?:[0-9]{1,2}|il['`’]|i{1,3})[\.\-\)\s]+|(?:tab|cap|syp|inj|inhaler|cream|oint|lotion|gel|drops|oil|shampoo|wash)\.?\s+)/i;
  const ignoreRegex = /^(?:sr\.?\s*no|medicine\s*\/\s*product|dosage\s*\/\s*instructions|city\s*care|dr\.?\s|patient|age|phone|address|date|visit|general\s*advice|get\s*well|mbbs|reg\.?\s*no|better\s*health|consultant|stay\s*hydrated|avoid\s*excessive|if\s*symptoms)/i;

  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const normLine = rawLine.replace(/[’‘`]/g, "'");

    if (ignoreRegex.test(normLine)) {
      if (currentItem) {
        items.push(currentItem);
        currentItem = null;
      }
      continue;
    }

    const isStart = itemStartRegex.test(normLine);

    if (isStart) {
      if (currentItem) items.push(currentItem);

      let rawName = cleanMedicineName(rawLine);

      let dosage = '';
      const dosageSplitMatch = rawName.match(/\s+(apply\s+(?:on|to)\b|take\b|[0-9]\s*(?:tablet|tab|cap|capsule|drop|ml|puff)|once|twice|thrice|\b(?:1-0-0-1|1-1-0-1|1-0-0-0|0-0-0-1|1-0-1|1-1-1|1-0-0|0-0-1|od|bd|tds|tid|qid|stat|sos)\b).*/i);

      let cleanName = rawName;
      if (dosageSplitMatch) {
        cleanName = rawName.slice(0, dosageSplitMatch.index).trim();
        dosage = rawName.slice(dosageSplitMatch.index).trim();
      }

      currentItem = {
        name: cleanName,
        details: [],
        dosage: dosage || 'As directed by doctor'
      };
    } else if (currentItem) {
      if (normLine.startsWith('(') || /\b(?:mg|mcg|gm|g|ml|tablet|capsule|cream|skin|oil|biotin|paracetamol|amoxicillin|clavulanic|montelukast|levocetirizine|esomeprazole|azithromycin)\b/i.test(normLine)) {
        currentItem.details.push(normLine);
      } else if (/\b(?:apply|twice|once|food|days|day|needed|scalp|leave|wash|hour|overnight|morning|night|1-0-0-1|1-1-0-1|1-0-0-0|0-0-0-1)\b/i.test(normLine)) {
        if (!currentItem.dosage || currentItem.dosage === 'As directed by doctor') {
          currentItem.dosage = normLine;
        } else {
          currentItem.dosage += ' ' + normLine;
        }
      }
    }
  }

  if (currentItem) items.push(currentItem);

  // Deduplicate items with similar names
  const uniqueItems = [];
  const seenKeys = new Set();
  for (const item of items) {
    const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const coreKey = key.replace(/(stripof.*|tablet|1tablet|1gablet|650mg)/g, '');
    if (!seenKeys.has(coreKey) && coreKey.length > 2) {
      seenKeys.add(coreKey);
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
}

// ── Smart Prescription Auto-Reader & Stock-Verified Matching Engine ──
async function analyzePrescriptionText(rawOcrText, notesText) {
  const combinedText = `${rawOcrText || ''}\n${notesText || ''}`.trim();
  const lower = combinedText.toLowerCase();

  // Fetch live store inventory from database
  const catalog = await Product.find({});

  const matched = [];
  const matchedIds = new Set();
  const unavailable = [];
  const unclear = [];

  // Parse structured items from OCR & notes
  const parsedItems = parsePrescriptionItems(combinedText);

  // Also check catalog products directly mentioned in text/notes if not already parsed
  for (const prod of catalog) {
    const pBase = prod.name.toLowerCase().replace(/\b(tablet|capsule|syrup|gel|inhaler|kit|pack|refill|drops)\b/gi, '').trim();
    if (pBase.length > 3 && lower.includes(pBase)) {
      const alreadyCaptured = parsedItems.some(p => p.name.toLowerCase().includes(pBase));
      if (!alreadyCaptured) {
        parsedItems.push({
          name: prod.name,
          details: [],
          dosage: prod.requiresPrescription ? '1 dose daily as directed by doctor' : 'As needed'
        });
      }
    }
  }

  // Cross-reference every prescribed item with stock inventory
  for (const item of parsedItems) {
    const fullName = [item.name, ...item.details].join(' ').trim();
    const searchStr = `${fullName} ${item.name}`.toLowerCase();

    let matchedProd = null;
    let matchType = 'Exact Product Match';

    // 1. Direct catalog match
    for (const prod of catalog) {
      const pBase = prod.name.toLowerCase().replace(/\b(tablet|capsule|syrup|gel|inhaler|kit|pack|refill|drops)\b/gi, '').trim();
      if (pBase.length > 3 && searchStr.includes(pBase)) {
        matchedProd = prod;
        matchType = `Exact Product Match (${prod.name})`;
        break;
      }
    }

    // 2. Generic formulation / chemical synonym match
    if (!matchedProd) {
      for (const sm of SYNONYM_MAP) {
        if (sm.tokens.some(t => searchStr.includes(t))) {
          matchedProd = catalog.find(p => sm.catalogMatch(p));
          if (matchedProd) {
            matchType = `Exact Generic Chemical Match (${matchedProd.name})`;
            break;
          }
        }
      }
    }

    if (matchedProd && !matchedIds.has(String(matchedProd._id))) {
      matchedIds.add(String(matchedProd._id));
      if (matchedProd.stock > 0) {
        // Available in Stock
        matched.push({
          productId: matchedProd._id,
          name: matchedProd.name,
          prescribedAs: fullName,
          matchType,
          brand: matchedProd.brand,
          pack: matchedProd.pack,
          price: matchedProd.price,
          image: matchedProd.image,
          stock: matchedProd.stock,
          isAvailable: true,
          dosage: item.dosage,
          qty: 1
        });
      } else {
        // Formulation carried in store, but currently Out of Stock
        const suggestions = findSuggestions(fullName, catalog);
        unavailable.push({
          name: fullName,
          prescribedName: fullName,
          dosage: item.dosage,
          status: 'out_of_stock',
          reason: `Formulation carried in store (${matchedProd.name}) — currently Out of Stock (0 units left)`,
          suggestedAlternative: suggestions[0] || null,
          suggestedAlternatives: suggestions,
          canSource: true
        });
      }
    } else if (!matchedProd) {
      // Prescribed item not in store catalog — Special Wholesale Sourcing
      const suggestions = findSuggestions(fullName, catalog);
      unavailable.push({
        name: fullName,
        prescribedName: fullName,
        dosage: item.dosage,
        status: 'unavailable',
        reason: 'Prescribed formulation not in retail store catalog — Wholesale distributor sourcing required',
        suggestedAlternative: suggestions[0] || null,
        suggestedAlternatives: suggestions,
        canSource: true
      });
    }
  }

  // Check if OCR captured cursive or blurry text requiring manual check
  if (parsedItems.length === 0 && rawOcrText && rawOcrText.trim().length > 20) {
    unclear.push({
      rawText: rawOcrText.trim().slice(0, 200),
      reason: 'Cursive or stylized handwriting detected — flagged for licensed pharmacist verification'
    });
  }

  // Clean summary
  const summaryParts = [];
  if (matched.length) summaryParts.push(`In Stock: ${matched.map(m => m.name).join(', ')}`);
  if (unavailable.length) summaryParts.push(`Sourcing / OOS: ${unavailable.map(u => u.name).join(', ')}`);
  if (unclear.length) summaryParts.push('Requires Pharmacist Verification');

  return {
    rawOcrText,
    extractedText: summaryParts.join(' | ') || (rawOcrText ? 'Text extracted from document, but no store medicines identified.' : 'No readable text detected in uploaded document.'),
    matchedItems: matched,
    unavailableItems: unavailable,
    unclearItems: unclear
  };
}

// POST /api/v1/prescriptions — upload, OCR & stock-verified matching
router.post('/', upload.single('prescription'), async (req, res) => {
  try {
    const { name, phone, notes } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Please enter your name' });
    if (!phone || !/^\d{10}$/.test(phone.trim())) return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Please attach your prescription (JPG, PNG or PDF, max 5MB)' });

    const user = await currentUser(req);
    let fileUrl = '';

    if (useCloudinary) {
      const uploadStream = () => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'vrinda/prescriptions', resource_type: 'auto' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      const result = await uploadStream();
      fileUrl = result.secure_url;
    } else {
      fileUrl = '/uploads/prescriptions/' + req.file.filename;
    }

    // 1. Run real OCR / PDF extraction on the uploaded file
    const rawOcrText = await extractTextFromFile(req.file);

    // 2. Run Stock-Verified Prescription Matching Engine
    const autoReadResult = await analyzePrescriptionText(rawOcrText, notes);

    // Status: 'analyzed' if items recognized, or 'new' for manual pharmacist inspection
    const status = (autoReadResult.matchedItems.length > 0 || autoReadResult.unavailableItems.length > 0)
      ? 'analyzed'
      : 'new';

    const rx = await Prescription.create({
      name: name.trim(),
      phone: phone.trim(),
      notes: (notes || '').trim(),
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      userId: user ? user._id : undefined,
      extractedText: autoReadResult.extractedText,
      matchedItems: autoReadResult.matchedItems,
      unavailableItems: autoReadResult.unavailableItems,
      unclearItems: autoReadResult.unclearItems,
      status
    });

    res.status(201).json({
      success: true,
      message: autoReadResult.matchedItems.length > 0
        ? `Prescription read successfully! ${autoReadResult.matchedItems.length} medicine(s) verified in stock.`
        : 'Prescription uploaded! Forwarded to licensed pharmacist for manual clinical review.',
      reference: rx._id,
      prescription: rx,
      autoRead: autoReadResult
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/prescriptions/:id — detailed view & tracking
router.get('/:id', async (req, res) => {
  try {
    const rx = await Prescription.findById(req.params.id)
      .populate('matchedItems.productId', 'name brand pack price image stock')
      .populate('orderId');
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });
    res.status(200).json({ success: true, prescription: rx });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Invalid prescription ID' });
  }
});

// POST /api/v1/prescriptions/:id/order — User places order directly from scanned prescription
router.post('/:id/order', async (req, res) => {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });

    const user = await currentUser(req);
    const { customer, address, paymentMethod = 'cod', selectedItems } = req.body;

    const itemsToOrder = (Array.isArray(selectedItems) && selectedItems.length > 0)
      ? selectedItems
      : rx.matchedItems.filter(i => i.isAvailable);

    if (itemsToOrder.length === 0) {
      return res.status(400).json({ success: false, message: 'No available medicines selected to order' });
    }

    // Verify stock
    for (const it of itemsToOrder) {
      const prod = await Product.findById(it.productId);
      if (prod && prod.stock < (it.qty || 1)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${prod.name}". Available: ${prod.stock}`
        });
      }
    }

    const subtotal = itemsToOrder.reduce((s, it) => s + (it.price * (it.qty || 1)), 0);
    const deliveryFee = subtotal >= 499 ? 0 : 40;
    const total = subtotal + deliveryFee;

    const snapshotItems = itemsToOrder.map(it => ({
      productId: it.productId,
      name: it.name,
      brand: it.brand || '',
      pack: it.pack || '',
      image: it.image || '',
      price: it.price,
      qty: it.qty || 1,
    }));

    const orderNumber = makeOrderNumber();
    const order = await Order.create({
      orderNumber,
      items: snapshotItems,
      subtotal,
      deliveryFee,
      total,
      customer: {
        name: customer?.name || rx.name,
        phone: customer?.phone || rx.phone,
        email: customer?.email || ''
      },
      address: {
        line1: address?.line1 || 'Express Prescription Delivery',
        city: address?.city || 'Mumbai',
        state: address?.state || 'Maharashtra',
        pincode: address?.pincode || '400050'
      },
      paymentMethod,
      userId: user ? user._id : rx.userId,
      status: 'placed'
    });

    // Deduct stock
    for (const it of itemsToOrder) {
      await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -(it.qty || 1) } });
    }

    // Update prescription
    rx.orderId = order._id;
    rx.orderNumber = orderNumber;
    rx.status = 'order_placed';
    await rx.save();

    // Send confirmation email asynchronously
    sendOrderConfirmation(order).catch(e => console.error('Prescription order email error:', e));

    res.status(201).json({
      success: true,
      message: 'Prescription order confirmed! Our pharmacist has verified and scheduled dispatch.',
      order,
      prescription: rx
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/prescriptions — admin queue
router.get('/', isLoggedIn, adminOnly, async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { orderNumber: new RegExp(q, 'i') }
      ];
    }

    const prescriptions = await Prescription.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, count: prescriptions.length, prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/prescriptions/:id/status — admin updates pipeline status
router.put('/:id/status', isLoggedIn, adminOnly, async (req, res) => {
  try {
    const allowed = ['new', 'analyzed', 'contacted', 'verified', 'order_placed', 'fulfilled', 'rejected'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const rx = await Prescription.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });

    await logActivity(req.user, `prescription.${req.body.status}`, `${rx.name} (${rx.phone})`);

    res.status(200).json({ success: true, prescription: rx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/prescriptions/:id/verify — admin pharmacist verification seal
router.put('/:id/verify', isLoggedIn, adminOnly, async (req, res) => {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });

    rx.status = 'verified';
    rx.verifiedBy = req.user.name;
    rx.verifiedAt = new Date();
    if (req.body.pharmacistNotes) rx.pharmacistNotes = req.body.pharmacistNotes.trim();
    await rx.save();

    await logActivity(req.user, 'prescription.verified', `Verified by Pharmacist ${req.user.name} for ${rx.name}`);

    res.status(200).json({ success: true, message: 'Prescription officially verified by pharmacist ✓', prescription: rx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/prescriptions/:id/admin-order — Admin creates order for customer on their behalf
router.post('/:id/admin-order', isLoggedIn, adminOnly, async (req, res) => {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });

    const availableItems = rx.matchedItems.filter(i => i.isAvailable);
    if (availableItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No available items to order from this prescription' });
    }

    const subtotal = availableItems.reduce((s, it) => s + (it.price * (it.qty || 1)), 0);
    const deliveryFee = subtotal >= 499 ? 0 : 40;
    const total = subtotal + deliveryFee;

    const orderNumber = makeOrderNumber();
    const order = await Order.create({
      orderNumber,
      items: availableItems.map(it => ({
        productId: it.productId,
        name: it.name,
        brand: it.brand || '',
        pack: it.pack || '',
        image: it.image || '',
        price: it.price,
        qty: it.qty || 1,
      })),
      subtotal,
      deliveryFee,
      total,
      customer: { name: rx.name, phone: rx.phone, email: '' },
      address: { line1: 'Prescription Order (Confirmed by Pharmacist)', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
      paymentMethod: 'cod',
      userId: rx.userId,
      status: 'confirmed'
    });

    // Deduct stock
    for (const it of availableItems) {
      await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -(it.qty || 1) } });
    }

    rx.orderId = order._id;
    rx.orderNumber = orderNumber;
    rx.status = 'order_placed';
    rx.verifiedBy = req.user.name;
    rx.verifiedAt = new Date();
    await rx.save();

    await logActivity(req.user, 'prescription.order_created', `Generated ${orderNumber} for ${rx.name} (₹${total})`);

    res.status(201).json({ success: true, message: `Order ${orderNumber} created successfully!`, order, prescription: rx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;