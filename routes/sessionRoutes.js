import express from "express";
import Session from "../models/Session.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware to check JWT
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// 👉 Book a new session
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { doctorId, patientName, mobile, slotStart, slotEnd, notes, mode } = req.body;

    if (!doctorId || !patientName || !mobile || !slotStart || !slotEnd || !mode) {
      return res.status(400).json({ error: "All fields except notes are required" });
    }

    const session = new Session({
      student: req.userId,
      doctorId,
      patientName,
      mobile,
      slotStart,
      slotEnd,
      notes,
      mode,
    });

    await session.save();
    res.status(201).json({ message: "Appointment booked successfully", session });
  } catch (error) {
    console.error("Error booking session:", error);
    res.status(500).json({ error: "Failed to book session" });
  }
});

// 👉 Get all sessions of logged-in student
router.get("/", authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({ student: req.userId })
      .populate("doctorId", "name specialization email") // populate doctor details
      .sort({ slotStart: 1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

export default router;
