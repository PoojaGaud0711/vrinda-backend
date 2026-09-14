const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minLength: [6, "Password must be at least 6 characters"], select: false },

    phone: { 
        type: String, 
        required: [true, "Please enter your phone number"], 
        unique: true, 
        maxLength: [10, "Phone number must be 10 digits"], 
        minLength: [10, "Phone number must be 10 digits"] 
    },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    dob: { type: Date },

    // ── THE 3 ROLES ──
    role: { type: String, enum: ["customer", "admin", "superadmin"], default: "customer" },

    // ── Admin control: blocked users cannot log in ──
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

// Scrambles password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compares password during login
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
