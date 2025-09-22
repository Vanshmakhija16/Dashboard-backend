import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import University from "../models/University.js";
import Doctor from "../models/Doctor.js";

const router = express.Router();

const ADMIN_EMAIL = "rahul3@gmail.com";
const ADMIN_PASSWORD = "123456"; // Use env vars or hash in production

// --------------------- SIGNUP ---------------------
/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user, associating university based on email domain,
 *          but bypassing domain validation for specific admin email
 */
router.post("/signup", async (req, res) => {
  let { name, email, password, role, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  email = email.trim().toLowerCase();
  role = role ? role.toLowerCase() : "student";

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Admin bypass signup logic
    if (email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD && role === "admin") {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        name,
        email,
        password: hashedPassword,
        phone,
        role: "admin",
        isVerified: true,
        isApproved: true,
      });
      await user.save();

      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

      return res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          university: null,
          isVerified: user.isVerified,
        },
      });
    }

    // Domain validation for students
    const emailDomain = email.split("@")[1].toLowerCase();
    const emailDomainWithAt = "@" + emailDomain;

    const matchedUniversity = await University.findOne({
      domainPatterns: { $in: [emailDomain, emailDomainWithAt] },
    });

    if (role === "student" && !matchedUniversity) {
      return res.status(400).json({
        message: "University could not be determined from your email. Please contact administrator.",
      });
    }

    const assignedUniversity = matchedUniversity ? matchedUniversity._id : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      ...(role === "student" && { university: assignedUniversity }),
      isVerified: true,
      isApproved: true,
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        university: user.university || null,
        isVerified: user.isVerified,
      },
      message: "Signup successful.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --------------------- LOGIN ---------------------
/**
 * @route   POST /api/auth/login
 * @desc    Login user with email + password
 *          Supports both Users (students/admins) and Doctors
 */
router.post("/login", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  email = email.trim().toLowerCase();
  password = String(password).trim();

  try {
    // Try to find in Users first
    let user = await User.findOne({ email }).populate("university", "name");
    let userType = "student";

    // If not found in Users, check Doctors
    if (!user) {
      user = await Doctor.findOne({ email });
      userType = "doctor";
      console.log("User", user)
    }

    if (!user) return res.status(400).json({ message: "Invalid email or password" });
    const trimmedpass = String(password).trim();
    console.log("Raw password:",trimmedpass );
     console.log("Stored hash:", user.password);
     console.log("Password type:", typeof password, `"${password}"`);
console.log("DB hash type:", typeof user.password, `"${user.password}"`);

     const isMatch = await bcrypt.compare(trimmedpass, user.password);
         console.log("Password match:", isMatch);

    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });



    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        university: userType === "student" ? user.university || null : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --------------------- CREATE UNIVERSITY ADMIN ---------------------
/**
 * @route   POST /api/admin/create-university-admin
 * @desc    Main admin creates a university admin
 *          Email is automatically generated as admin@universitydomain
 */
router.post("/admin/create-university-admin", async (req, res) => {
  const { universityId, password } = req.body;

  if (!universityId || !password) {
    return res.status(400).json({ message: "University ID and password are required" });
  }

  try {
    const university = await University.findById(universityId);
    if (!university) return res.status(404).json({ message: "University not found." });

    if (!university.domainPatterns || university.domainPatterns.length === 0) {
      return res.status(400).json({ message: "University has no domain pattern defined." });
    }

    const domain = university.domainPatterns[0];
    const username = "admin" + university.name.replace(/\s+/g, "").toLowerCase();
    const email = `admin@${domain}`;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "University admin already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const uniAdmin = new User({
      name: username,
      email,
      password: hashedPassword,
      role: "university_admin",
      university: university._id,
      isVerified: true,
      isApproved: true,
    });

    await uniAdmin.save();

    res.status(201).json({
      message: "University admin created successfully",
      user: {
        name: uniAdmin.name,
        email: uniAdmin.email,
        role: uniAdmin.role,
        university: university.name,
      },
    });
  } catch (err) {
    console.error("Create university admin error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
