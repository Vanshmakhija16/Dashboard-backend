import express from "express";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js"; // Assuming Doctor model is imported
import jwt from "jsonwebtoken";

const router = express.Router();

// Auth middleware
const authMiddleware = (req, res, next) => {
  console.log("start middleware");
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role; // role included in token
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// ======================
// Admin / Student Routes
// ======================

// Book a new appointment (for students)
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Restrict to students
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const { doctorId, slotStart, slotEnd, notes, mode } = req.body;

    if (!doctorId || !slotStart || !slotEnd) {
      return res.status(400).json({ error: "Doctor ID, slotStart and slotEnd are required" });
    }

    // Check if doctor exists and is available
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.isAvailable !== "available") {
      return res.status(400).json({ error: "Doctor is not available for booking" });
    }

    const appointment = new Appointment({
      student: req.userId,
      doctor: doctorId,
      slotStart,
      slotEnd,
      notes,
      mode,
    });

    await appointment.save();
    res.status(201).json({ message: "Appointment booked successfully!", appointment });
  } catch (err) {
    console.error("Error booking appointment:", err);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

// Get all appointments (admin only)
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Access denied: admins only" });
    }

    const appointments = await Appointment.find()
      .populate("doctor", "name specialization email phone")
      .populate("student", "name email phone")
      .sort({ slotStart: 1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("Error fetching all appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Get all appointments for a specific doctor (admin only)
router.get("/doctor/:doctorId", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Access denied: admins only" });
    }

    const { doctorId } = req.params;

    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("student", "name email phone")
      .sort({ slotStart: 1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Update appointment status (doctors or admins only)
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    // Restrict to doctors and admins
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["pending", "approved", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    // Ensure doctors can only update their own appointments
    if (req.userRole === "doctor" && appointment.doctor.toString() !== req.userId) {
      return res.status(403).json({ error: "Access denied: not your appointment" });
    }

    appointment.status = status;
    await appointment.save();

    res.json({ message: "Appointment status updated", appointment });
  } catch (err) {
    console.error("Error updating appointment status:", err);
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

// ======================
// Student-Specific Routes
// ======================

// Total sessions attended (student)
router.get("/my/attended", authMiddleware, async (req, res) => {
  try {
    // Restrict to students
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const count = await Appointment.countDocuments({
      student: req.userId,
      status: "completed",
    });
    res.json({ count });
  } catch (err) {
    console.error("Error getting total attended sessions:", err);
    res.status(500).json({ error: "Failed to get attended sessions" });
  }
});

// Total upcoming sessions (student)
router.get("/my/upcoming", authMiddleware, async (req, res) => {
  try {
    // Restrict to students
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const now = new Date();
    const count = await Appointment.countDocuments({
      student: req.userId,
      status: "approved",
      slotStart: { $gte: now },
    });
    res.json({ count });
  } catch (err) {
    console.error("Error getting upcoming sessions:", err);
    res.status(500).json({ error: "Failed to get upcoming sessions" });
  }
});

// ======================
// Doctor-Specific Routes
// ======================

// Get all appointments for the logged-in doctor or all appointments for admin
router.get("/my/appointments", authMiddleware, async (req, res) => {
  try {
    // Check if user is a doctor or admin
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    // Build query
    let query = {};
    if (req.userRole === "doctor") {
      query.doctor = req.userId; // Filter by doctor ID for doctors
    }

    // Filter by status if provided (e.g., ?status=pending)
    if (req.query.status) {
      if (!["pending", "approved", "rejected", "completed"].includes(req.query.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      query.status = req.query.status;
    }

    // Add search functionality if search term provided
    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") {
        query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
      }
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ slotStart: 1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Get pending appointments for the logged-in doctor or all pending for admin
router.get("/appointments/pending", authMiddleware, async (req, res) => {
  try {
    console.log("Pending appointments route hit");

    // Check if user is a doctor or admin
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    // Build query
    let query = { status: "pending" };
    if (req.userRole === "doctor") {
      query.doctor = req.userId; // Filter by doctor ID for doctors
    }

    // Add search functionality if search term provided
    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") {
        query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
      }
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ createdAt: -1 });

    console.log("Found pending appointments:", appointments.length);

    res.json({ data: appointments });
  } catch (err) {
    console.error("ERROR in pending appointments:", err);
    res.status(500).json({ error: "Failed to fetch pending appointments" });
  }
});

// Get rejected appointments for the logged-in doctor or all rejected for admin
router.get("/rejected", authMiddleware, async (req, res) => {
  try {
    console.log("try")
    // Check if user is a doctor or admin
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    // Build query
    let query = { status: "rejected" };
    if (req.userRole === "doctor") {
      query.doctor = req.userId; // Filter by doctor ID for doctors
    }

    // Add search functionality if search term provided
    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") {
        query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
      }
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ createdAt: -1 });

    console.log("Rejected appointments:", appointments.length);

    res.json({ data: appointments });
  } catch (err) {
    console.error("Error fetching rejected appointments:", err);
    res.status(500).json({ error: "Failed to fetch rejected appointments" });
  }
});

// Get approved appointments for the logged-in doctor or all approved for admin
router.get("/approved", authMiddleware, async (req, res) => {
  try {
    console.log("Approved appointments route hit");

    // Check if user is a doctor or admin
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    // Build query
    let query = { status: "approved" };
    if (req.userRole === "doctor") {
      query.doctor = req.userId; // Filter by doctor ID for doctors
    }

    // Add search functionality if search term provided
    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") {
        query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
      }
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ slotStart: 1 });

    console.log("Found approved appointments:", appointments.length);

    res.json({ data: appointments });
  } catch (err) {
    console.error("Error fetching approved appointments:", err);
    res.status(500).json({ error: "Failed to fetch approved appointments" });
  }
});

export default router;