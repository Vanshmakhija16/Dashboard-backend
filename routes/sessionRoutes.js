// import express from "express";
// import mongoose from "mongoose";
// import Session from "../models/Session.js";
// import Doctor from "../models/Doctor.js";
// import User from "../models/User.js"; 
// import jwt from "jsonwebtoken";
// import nodemailer from "nodemailer";
// import dotenv from "dotenv"
// const router = express.Router();

// dotenv.config()
// // --------------------
// // Email transporter
// // --------------------
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: parseInt(process.env.SMTP_PORT),
//   secure: process.env.SMTP_SECURE === "true",
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// // --------------------
// // Middleware to check JWT
// // --------------------
// const authMiddleware = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) {
//     return res.status(401).json({ error: "No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Store both for convenience
//     req.userId = decoded.id;
//     req.userRole = decoded.role;
//     req.user = { id: decoded.id, role: decoded.role }; // 👈 add this so routes using req.user don’t break

//     next();
//   } catch (err) {
//     return res.status(403).json({ error: "Invalid or expired token" });
//   }
// };

// // --------------------
// // Helper: Send email notifications
// // --------------------
// const sendNotifications = async (session) => {
//   const student = await User.findById(session.student);
//   const doctor = await Doctor.findById(session.doctorId);
//   // const adminEmail = process.env.ADMIN_EMAIL; // set in your .env
//   const adminEmail = "vanshmakhija18@gmail.com"; // set in your .env

//   const studentName = student?.name || "Student";
//   const doctorName = doctor?.name || "Doctor";

//   // const studentEmail = student?.email ;
//   // const doctorEmail = doctor?.email;
//   const studentEmail = "kvmakhija1624@gmail.com" ;
//   const doctorEmail = "www.vansh1624@gmail.com";

//   const date = new Date(session.slotStart).toLocaleDateString(undefined, {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   });
//   const time = new Date(session.slotStart).toLocaleTimeString(undefined, {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });

//   const subject = "✅ Your session is confirmed";
//   const text = `Session Details:

// Student: ${studentName}
// Doctor: ${doctorName}
// Date: ${date}
// Time: ${time}
// Mode: ${session.mode}
// Notes: ${session.notes || "N/A"}

// Thank you for booking with us.`;

//   const recipients = [studentEmail, doctorEmail, adminEmail].filter(Boolean);

//   try {
//     for (const email of recipients) {
//       await transporter.sendMail({
//         from: process.env.SMTP_FROM,
//         to: email,
//         subject,
//         text,
//       });
//       console.log(`Email sent to ${email}`);
//     }
//   } catch (err) {
//     console.error("Failed to send email:", err);
//   }
// };

// // Book a new session

// router.post("/", authMiddleware, async (req, res) => {
//   try {
//     if (req.userRole !== "student") {
//       return res.status(403).json({ error: "Access denied: students only" });
//     }

//     const { doctorId, slotStart, slotEnd, notes, mode } = req.body;

//     if (!doctorId || !slotStart || !slotEnd || !mode) {
//       return res.status(400).json({
//         error: "Doctor ID, slotStart, slotEnd, and mode are required",
//       });
//     }

//     // Get logged-in student info
//     const student = await User.findById(req.userId);
//     if (!student) return res.status(404).json({ error: "Student not found" });

//     // ----------------------------
//     // Restriction: max 2 sessions per day
//     // ----------------------------
//     const slotDate = new Date(slotStart);

//     const startOfDay = new Date(slotDate);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(slotDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     console.log("Checking daily session limit for student:", req.userId);
//     console.log("Day range:", startOfDay, " -> ", endOfDay);

//     const todaySessions = await Session.find({
//       student: req.userId,
//       slotStart: { $gte: startOfDay, $lte: endOfDay },
//     });

//     console.log("Existing sessions today:", todaySessions.length);

//     if (todaySessions.length >= 2) {
//       return res.status(400).json({
//         msg: "❌ You can book only 2 sessions per day. Please try again tomorrow.",
//       });
//     }
//     // ---------------------------------------

//     const studentMobile = student.mobile || "N/A";

//     // Normalize mode
//     const modeValue =
//       mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
//     if (!["Online", "Offline"].includes(modeValue)) {
//       return res
//         .status(400)
//         .json({ error: "Invalid mode. Must be 'Online' or 'Offline'" });
//     }

//     // Check doctor availability
//     const doctor = await Doctor.findById(doctorId);
//     if (!doctor || doctor.isAvailable !== "available") {
//       return res
//         .status(400)
//         .json({ error: "Doctor is not available for booking" });
//     }

//     const date = new Date(slotStart).toISOString().split("T")[0];
//     const slotStartTime = new Date(slotStart).toLocaleTimeString("en-GB", {
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//     const slotEndTime = new Date(slotEnd).toLocaleTimeString("en-GB", {
//       hour: "2-digit",
//       minute: "2-digit",
//     });

//     // ✅ Fix: check if dateSlots is Map or Object
//     if (
//       (doctor.dateSlots instanceof Map && !doctor.dateSlots.has(date)) ||
//       (!(doctor.dateSlots instanceof Map) && !doctor.dateSlots[date])
//     ) {
//       const fallbackSlots = doctor
//         .getAvailabilityForDate(date)
//         .map((s) => ({ ...s }));

//       if (doctor.dateSlots instanceof Map) {
//         doctor.dateSlots.set(date, fallbackSlots);
//       } else {
//         doctor.dateSlots[date] = fallbackSlots;
//       }

//       doctor.markModified("dateSlots");
//       await doctor.save();
//     }

//     // Check if slot is available
//     const isAvailable = doctor.isAvailableAtDateTime(
//       date,
//       slotStartTime,
//       slotEndTime
//     );
//     if (!isAvailable) {
//       return res.status(400).json({ error: "Selected slot is already booked" });
//     }

//     // Book slot in doctor model
//     const booked = await doctor.bookSlot(date, slotStartTime, slotEndTime);
//     if (!booked) {
//       return res.status(400).json({
//         error: "Failed to book slot. It may have just been taken.",
//       });
//     }

//     // Save session (auto-approved)
//     const session = new Session({
//       student: req.userId,
//       doctorId,
//       patientName: student.name,
//       mobile: studentMobile,
//       slotStart,
//       slotEnd,
//       notes,
//       mode: modeValue,
//       status: "approved",
//     });

//     await session.save();

//     // Send notifications if util exists
//     if (typeof sendNotifications === "function") {
//       await sendNotifications(session);
//     }

//     res.status(201).json({
//       message: "Session booked successfully",
//       session,
//     });
//   } catch (error) {
//     console.error("Error booking session:", error);
//     res.status(500).json({ error: "Failed to book session" });
//   }
// });


// router.put("/:id/status", authMiddleware, async (req, res) => {
//   try {
//     const allSessions = await Session.find({});
// console.log("All sessions in DB:", allSessions);

//     const session = await Session.findById(req.params.id);
// console.log(session , req.params.id)

// console.log("Incoming ID:", req.params.id);
// console.log("IsValidObjectId:", mongoose.Types.ObjectId.isValid(req.params.id));
//     if (!session) return res.status(404).json({ error: "Session not found" });

//     // Permission: doctor assigned to session or admin
//    const userId = req.userId;
// const isDoctorOrAdmin =
//   req.userRole === "admin" || (session.doctor && session.doctor.toString() === userId);

//     if (!isDoctorOrAdmin) {
//       return res.status(403).json({ error: "Not authorized to change this session" });
//     }
//      const { status } = req.body;

//     if (!["approved","completed","cancelled"].includes(status)) {
//       return res.status(400).json({ error: "Invalid status" });
//     }

//     const prevStatus = session.status;
//     session.status = status;
//     session.completedAt = status === "completed" ? new Date() : null;
//     await session.save();

//     // Optional: keep denormalized counter on User.attendedCount
//     // Only run if User.attendedCount exists in your schema and you want a counter.
//     // Make this idempotent: only inc if prevStatus !== 'completed' && status === 'completed'
//     if (status === "completed" || prevStatus === "completed") {
//       // This patch updates user counter only if your User model has `attendedCount`
//       try {
//         if (prevStatus !== "completed" && status === "completed") {
//           await User.findByIdAndUpdate(session.student, { $inc: { attendedCount: 1 } });
//         } else if (prevStatus === "completed" && status !== "completed") {
//           await User.findByIdAndUpdate(session.student, { $inc: { attendedCount: -1 } });
//         }
//       } catch (err) {
//         // not fatal; log
//         console.error("Failed updating user counter:", err);
//       }
//     }

//     res.json(session);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });




// // --------------------
// // Get all sessions of logged-in student
// // --------------------
// router.get("/", authMiddleware, async (req, res) => {
//   try {
//     const sessions = await Session.find({ student: req.userId })
//       .populate("doctorId", "name specialization email")
//       .sort({ slotStart: 1 });
//     res.json(sessions);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch sessions" });
//   }

// });

// // Doctor dashboard: get sessions
// router.get("/my-sessions", authMiddleware, async (req, res) => {
//   try {
//     if (req.userRole !== "doctor") {
//       return res.status(403).json({ error: "Access denied: doctors only" });
//     }

//     const { date, day, startTime, endTime } = req.query;

//     let filter = { doctorId: req.userId };

//     // Filter by specific date
//     if (date) filter.slotStart = { $gte: new Date(date + "T00:00:00"), $lte: new Date(date + "T23:59:59") };

//     // Filter by day of the week
//     if (day) {
//       const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//       const dayIndex = days.indexOf(day);
//       if (dayIndex !== -1) {
//         filter.slotStart = {
//           ...filter.slotStart,
//           $expr: { $eq: [{ $dayOfWeek: "$slotStart" }, dayIndex + 1] } // MongoDB $dayOfWeek: Sunday=1
//         };
//       }
//     }

//     // Filter by time slot
//     if (startTime || endTime) {
//       const timeFilter = {};
//       if (startTime) timeFilter.$gte = new Date("1970-01-01T" + startTime + ":00Z").toISOString();
//       if (endTime) timeFilter.$lte = new Date("1970-01-01T" + endTime + ":00Z").toISOString();
//       filter.slotStart = { ...filter.slotStart, ...timeFilter };
//     }

//     const allSessions = await Session.find(filter)
//       .populate("student", "name email mobile")
//       .populate("doctorId", "name specialization")
//       .sort({ slotStart: 1 });

//     const now = new Date();
//     const upcoming = allSessions.filter(s => new Date(s.slotStart) >= now);
//     const history = allSessions.filter(s => new Date(s.slotStart) < now);

//     res.status(200).json({ upcoming, history });
//   } catch (err) {
//     console.error("Error fetching doctor sessions:", err);
//     res.status(500).json({ error: "Failed to fetch sessions" });
//   }
// });

// export default router;
// routes/sessionRoutes.js
import express from "express";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

// --------------------
// Email transporter
// --------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --------------------
// Middleware to check JWT
// --------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// --------------------
// Helper: format time as "HH:MM" (24-hour)
// --------------------
const formatTime = (date) => {
  const d = new Date(date);
  // If invalid date, return null
  if (isNaN(d)) return null;
  return d.toISOString().substring(11, 16); // e.g. "09:00", "14:15"
};

// --------------------
// Helper: build ISO datetime from date + time
//  - date: "YYYY-MM-DD"
//  - time: "HH:mm"
// returns ISO string or null if invalid
// --------------------
const buildISOFromDateAndTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  // normalize time (ensure "HH:mm")
  const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeStr);
  if (!timeMatch) return null;
  // create ISO local datetime (no timezone shift) using `dateStr + 'T' + time + ':00'`
  const iso = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(iso)) return null;
  return iso.toISOString();
};

// --------------------
// Helper: Send email notifications
// --------------------
const sendNotifications = async (session) => {
  try {
    const student = await User.findById(session.student);
    const doctor = await Doctor.findById(session.doctorId);
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMINEMAIL || "admin@example.com";

    const studentName = student?.name || "Student";
    const doctorName = doctor?.name || "Doctor";

    const studentEmail = student?.email || null;
    const doctorEmail = doctor?.email || null;

    const date = new Date(session.slotStart).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time = new Date(session.slotStart).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const subject = "✅ Your session is confirmed";
    const text = `Session Details:

Student: ${studentName}
Doctor: ${doctorName}
Date: ${date}
Time: ${time}
Mode: ${session.mode}
Notes: ${session.notes || "N/A"}

Thank you for booking with us.`;

    const recipients = [studentEmail, doctorEmail, adminEmail].filter(Boolean);

    for (const email of recipients) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTPFROM || "no-reply@example.com",
        to: email,
        subject,
        text,
      });
    }
  } catch (err) {
    console.error("Failed to send email:", err);
    // not fatal for booking
  }
};

// --------------------
// Book a new session
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const { doctorId, slotStart: rawSlotStart, slotEnd: rawSlotEnd, notes, mode } = req.body;
    console.log("📩 Incoming request body:", req.body);

    if (!doctorId || !rawSlotStart || !rawSlotEnd || !mode) {
      return res.status(400).json({
        error: "Doctor ID, slotStart, slotEnd, and mode are required",
      });
    }

    // Convert to Date objects
    const slotStartDate = new Date(rawSlotStart);
    const slotEndDate = new Date(rawSlotEnd);

    if (isNaN(slotStartDate) || isNaN(slotEndDate)) {
      return res.status(400).json({ error: "Invalid slotStart or slotEnd datetime" });
    }

    // ----------------------------
    // Fetch student
    // ----------------------------
    const student = await User.findById(req.userId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    // ----------------------------
    // Restriction: max 2 sessions per day
    // ----------------------------
    const dayStart = new Date(slotStartDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(slotStartDate);
    dayEnd.setHours(23, 59, 59, 999);

    const todaySessions = await Session.find({
      student: req.userId,
      slotStart: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ["cancelled", "rejected"] },
    });

    console.log("📌 Existing active sessions today:", todaySessions.length);

    if (todaySessions.length >= 2) {
      return res.status(400).json({
        error: "❌ You can book only 2 active sessions per day. Please try again tomorrow.",
      });
    }

    // ----------------------------
    // Normalize mode
    // ----------------------------
    const modeValue = typeof mode === "string" && mode.length
      ? mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()
      : null;

    if (!modeValue || !["Online", "Offline"].includes(modeValue)) {
      return res.status(400).json({ error: "Invalid mode. Must be 'Online' or 'Offline'" });
    }

    // ----------------------------
    // Fetch doctor and check availability
    // ----------------------------
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    if (doctor.isAvailable !== "available") {
      return res.status(400).json({ error: "Doctor is not available for booking" });
    }

    // ----------------------------
    // Extract date & HH:mm for slot checking
    // ----------------------------
    const bookingDate = slotStartDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const bookingStartTime = slotStartDate.toTimeString().slice(0, 5); // HH:mm
    const bookingEndTime = slotEndDate.toTimeString().slice(0, 5);

    console.log("📌 Trying to book slot:", { bookingDate, bookingStartTime, bookingEndTime });

    // ----------------------------
    // Ensure doctor slots exist
    // ----------------------------
    if (
      (doctor.dateSlots instanceof Map && !doctor.dateSlots.has(bookingDate)) ||
      (!(doctor.dateSlots instanceof Map) && !doctor.dateSlots?.[bookingDate])
    ) {
      const fallbackSlots = doctor.getAvailabilityForDate
        ? doctor.getAvailabilityForDate(bookingDate)
        : [];
      const normalizedFallback = (fallbackSlots || []).map(s => ({ ...s }));
      if (doctor.dateSlots instanceof Map) {
        doctor.dateSlots.set(bookingDate, normalizedFallback);
      } else {
        doctor.dateSlots = doctor.dateSlots || {};
        doctor.dateSlots[bookingDate] = normalizedFallback;
      }
      doctor.markModified && doctor.markModified("dateSlots");
      await doctor.save();
    }

    // ----------------------------
    // Check if requested slot is available
    // ----------------------------
    const slots = doctor.dateSlots instanceof Map
      ? doctor.dateSlots.get(bookingDate)
      : (doctor.dateSlots?.[bookingDate] || []);

    const slotIndex = slots.findIndex(
      slot => slot.startTime === bookingStartTime &&
              slot.endTime === bookingEndTime &&
              slot.isAvailable !== false
    );

    if (slotIndex === -1) {
      return res.status(400).json({ error: "Selected slot is already booked or not available" });
    }

    // Mark slot as booked
    slots[slotIndex].isAvailable = false;
    if (doctor.dateSlots instanceof Map) {
      doctor.dateSlots.set(bookingDate, slots);
    } else {
      doctor.dateSlots[bookingDate] = slots;
    }
    doctor.markModified && doctor.markModified("dateSlots");
    await doctor.save();
    console.log("📌 Slot marked booked on doctor record");

    // ----------------------------
    // Create session
    // ----------------------------
    const session = new Session({
      student: req.userId,
      doctorId,
      patientName: student.name,
      mobile: student.mobile || "N/A",
      slotStart: slotStartDate.toISOString(),
      slotEnd: slotEndDate.toISOString(),
      notes,
      mode: modeValue,
      status: "booked",
    });

    await session.save();
    console.log("✅ Session saved:", session._id);

    // Optionally notify
    await sendNotifications(session);

    res.status(201).json({
      message: "✅ Session booked successfully",
      session,
    });

  } catch (error) {
    console.error("❌ Error booking session:", error);
    res.status(500).json({ error: "Failed to book session" });
  }
});


// --------------------
// Other routes remain unchanged below (status update, get sessions, etc.)
// Copy your existing other route handlers (update status, GET /, GET /my-sessions, etc.)
// I will include them here unchanged so the file remains self-contained.
// --------------------

// Update session status
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const allSessions = await Session.find({});
    console.log("All sessions in DB:", allSessions);

    const session = await Session.findById(req.params.id);
    console.log(session, req.params.id);

    if (!session) return res.status(404).json({ error: "Session not found" });

    const userId = req.userId;
    const isDoctorOrAdmin =
      req.userRole === "admin" ||
      (session.doctorId && session.doctorId.toString() === userId);

    if (!isDoctorOrAdmin) {
      return res.status(403).json({ error: "Not authorized to change this session" });
    }

    const { status } = req.body;

    if (!["approved", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const prevStatus = session.status;
    session.status = status;
    session.completedAt = status === "completed" ? new Date() : null;
    await session.save();

    try {
      if (prevStatus !== "completed" && status === "completed") {
        await User.findByIdAndUpdate(session.student, {
          $inc: { attendedCount: 1 },
        });
      } else if (prevStatus === "completed" && status !== "completed") {
        await User.findByIdAndUpdate(session.student, {
          $inc: { attendedCount: -1 },
        });
      }
    } catch (err) {
      console.error("Failed updating user counter:", err);
    }

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all sessions of logged-in student
router.get("/", authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({ student: req.userId })
      .populate("doctorId", "name specialization email")
      .sort({ slotStart: 1 });
    res.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Doctor dashboard: get sessions
router.get("/my-sessions", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "doctor") {
      return res.status(403).json({ error: "Access denied: doctors only" });
    }

    const { date, day, startTime, endTime } = req.query;
    let filter = { doctorId: req.userId };

    if (date)
      filter.slotStart = {
        $gte: new Date(date + "T00:00:00"),
        $lte: new Date(date + "T23:59:59"),
      };

    if (day) {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayIndex = days.indexOf(day);
      if (dayIndex !== -1) {
        filter.slotStart = {
          ...filter.slotStart,
          $expr: { $eq: [{ $dayOfWeek: "$slotStart" }, dayIndex + 1] },
        };
      }
    }

    if (startTime || endTime) {
      const timeFilter = {};
      if (startTime)
        timeFilter.$gte = new Date("1970-01-01T" + startTime + ":00Z").toISOString();
      if (endTime)
        timeFilter.$lte = new Date("1970-01-01T" + endTime + ":00Z").toISOString();
      filter.slotStart = { ...filter.slotStart, ...timeFilter };
    }

    const allSessions = await Session.find(filter)
      .populate("student", "name email mobile")
      .populate("doctorId", "name specialization")
      .sort({ slotStart: 1 });

    const now = new Date();
    const upcoming = allSessions.filter((s) => new Date(s.slotStart) >= now);
    const history = allSessions.filter((s) => new Date(s.slotStart) < now);

    res.status(200).json({ upcoming, history });
  } catch (err) {
    console.error("Error fetching doctor sessions:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

export default router;
