require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// ⚠️ CHANGE THIS PASSWORD after your first login!
const SUPER_ADMIN = {
    name: 'Super Admin',
    email: 'superadmin@vrinda.com',
    password: 'Vrinda@Super123',
    phone: '9999999999',
    gender: 'Other',
};

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. One-time migration: old "user" role → "customer"
    const migrated = await User.updateMany({ role: 'user' }, { $set: { role: 'customer' } });
    console.log(`🔄 Migrated ${migrated.modifiedCount} old users to "customer"`);

    // 2. Create Super Admin (or promote if the email already exists)
    const existing = await User.findOne({ email: SUPER_ADMIN.email });
    if (existing) {
        existing.role = 'superadmin';
        existing.isBlocked = false;
        await existing.save();
        console.log(`👑 Promoted existing account to Super Admin: ${SUPER_ADMIN.email}`);
    } else {
        // User.create triggers the pre-save hook → password gets hashed
        await User.create({ ...SUPER_ADMIN, role: 'superadmin' });
        console.log(`👑 Super Admin created: ${SUPER_ADMIN.email}`);
    }

    console.log('\n─────────────────────────────');
    console.log('Super Admin login:');
    console.log(`  Email:    ${SUPER_ADMIN.email}`);
    console.log(`  Password: ${SUPER_ADMIN.password}`);
    console.log('─────────────────────────────');
    console.log('⚠️  Change this password after first login!');

    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
