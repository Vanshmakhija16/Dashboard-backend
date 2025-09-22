// routes/doctor.routes.js
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";

const router = express.Router();

// --------------------- HELPERS ---------------------

// Format doctor for frontend response
const formatDoctorResponse = (doctor) => {
  // Call the method BEFORE converting to plain object
  const today = new Date().toISOString().slice(0, 10);
  const todaySlots = doctor.getAvailabilityForDate ? doctor.getAvailabilityForDate(today) : [];
  
  // Add debugging
  console.log(`Doctor ${doctor.name}:`);
  console.log(`- Today (${today}) slots:`, todaySlots);
  console.log(`- Has dateSlots:`, doctor.dateSlots ? 'Yes' : 'No');
  if (doctor.dateSlots) {
    console.log(`- DateSlots keys:`, Array.from(doctor.dateSlots.keys()));
  }
  
  // NOW convert to plain object
  const obj = doctor.toObject();
  
  obj.todaySchedule = {
    date: today,
    available: true, // Change this line - always show as available
    slots: todaySlots,
  };
  
  // Rest of existing code...
  obj.weeklySchedule = obj.weeklySchedule || [];
  
  if (obj.dateSlots && obj.dateSlots instanceof Map) {
    const dateSlotObj = {};
    for (const [key, value] of obj.dateSlots.entries()) {
      dateSlotObj[key] = value;
    }
    obj.slots = dateSlotObj;
    obj.dateSlots = dateSlotObj;
  } else if (obj.dateSlots && typeof obj.dateSlots === 'object') {
    obj.slots = obj.dateSlots;
  }
  
  return obj;
};

// Validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid doctor ID" });
  }
  next();
};

// Generate random password
const generatePassword = () => {
  return Math.random().toString(36).slice(-8);
};

// --------------------- ROUTES ---------------------

// Add new doctor
router.post("/", async (req, res) => {
  try {
    const {
      name,
      specialization,
      email,
      phone,
      availabilityType,
      weeklySchedule,
      todaySchedule,
      universities,
    } = req.body;

    if (!name || !specialization || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Name, specialization, and email are required" });
    }

    const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (existingDoctor) {
      return res.status(400).json({ success: false, message: "Doctor with this email already exists" });
    }

    // Generate random password
    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const safeTodaySchedule =
      todaySchedule && typeof todaySchedule === "object"
        ? {
            date: todaySchedule.date || new Date().toISOString().slice(0, 10),
            available: todaySchedule.available ?? false,
            slots: Array.isArray(todaySchedule.slots) ? todaySchedule.slots : [],
          }
        : { date: new Date().toISOString().slice(0, 10), available: false, slots: [] };

    const doctor = new Doctor({
      name,
      specialization,
      email: email.toLowerCase(),
      phone: phone || "",
      password: hashedPassword,
      role: "doctor",
      availabilityType: availabilityType || "both",
      weeklySchedule: Array.isArray(weeklySchedule) ? weeklySchedule : [],
      todaySchedule: safeTodaySchedule,
      universities: Array.isArray(universities) ? universities : [],
      dateSlots: new Map() // Initialize empty dateSlots
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      data: formatDoctorResponse(doctor),
      generatedPassword: rawPassword, // Send plain password back to admin
    });
  } catch (err) {
    console.error("Error creating doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all doctors (admin)
router.get("/", async (req, res) => {
  try {
    const { specialization, availabilityType, search } = req.query;
    
    let filter = {};
    
    if (specialization) {
      filter.specialization = { $regex: specialization, $options: "i" };
    }
    
    if (availabilityType) {
      filter.availabilityType = availabilityType;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } }
      ];
    }

    const doctors = await Doctor.find(filter)
      .select('-password')
      .populate('universities', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      data: doctors.map(formatDoctorResponse) 
    });
  } catch (err) {
    console.error("Error fetching doctors:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get doctors for student's university
router.get("/my-university", async (req, res) => {
  try {
    const student = await User.findById(req.userId).select("university");
    if (!student || !student.university) {
      return res.status(404).json({ success: false, message: "Student's university not found" });
    }
    const doctors = await Doctor.find({ universities: student.university })
      .select('-password')
      .populate('universities', 'name');
    
    // Use Promise.all since formatDoctorResponse is now async
    const formattedDoctors = await Promise.all(doctors.map(formatDoctorResponse));
    
    res.status(200).json({ 
      success: true, 
      data: formattedDoctors
    });
  } catch (err) {
    console.error("Failed to fetch university doctors:", err);
    res.status(500).json({ success: false, message: "Failed to fetch university doctors" });
  }
});

// Get doctor by ID
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .select('-password')
      .populate('universities', 'name');
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    
    res.status(200).json({ 
      success: true, 
      data: formatDoctorResponse(doctor) 
    });
  } catch (err) {
    console.error("Error fetching doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update full doctor info
router.put("/:id", validateObjectId, async (req, res) => {
  try {
    const {
      name,
      specialization,
      email,
      phone,
      availabilityType,
      weeklySchedule,
      todaySchedule,
      universities,
    } = req.body;

    if (!name || !specialization || !email) {
      return res.status(400).json({ success: false, message: "Name, specialization, and email are required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Check if email is being changed and if it already exists
    if (email !== doctor.email) {
      const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
      if (existingDoctor) {
        return res.status(400).json({ success: false, message: "Doctor with this email already exists" });
      }
    }

    // Update fields
    doctor.name = name;
    doctor.specialization = specialization;
    doctor.email = email.toLowerCase();
    doctor.phone = phone || doctor.phone;
    doctor.availabilityType = availabilityType || doctor.availabilityType;
    doctor.weeklySchedule = Array.isArray(weeklySchedule) ? weeklySchedule : doctor.weeklySchedule;
    doctor.universities = Array.isArray(universities) ? universities : doctor.universities;

    if (todaySchedule) {
      doctor.todaySchedule = {
        date: todaySchedule.date || new Date().toISOString().slice(0, 10),
        available: todaySchedule.available ?? false,
        slots: Array.isArray(todaySchedule.slots) ? todaySchedule.slots : [],
      };
    }

    await doctor.save();

    res.status(200).json({ 
      success: true, 
      data: formatDoctorResponse(doctor) 
    });
  } catch (err) {
    console.error("Error updating doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ NEW: Get all date slots for a doctor
router.get("/:id/all-slots", validateObjectId, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const allSlots = doctor.getAllDateSlots();
    res.json({ success: true, data: allSlots });
  } catch (error) {
    console.error("Error fetching all slots:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ✅ NEW: Update multiple date slots for a doctor
// ✅ Update multiple date slots for a doctor with availability check
router.patch("/:id/all-slots", validateObjectId, async (req, res) => {
  try {
    const { dateSlots, isAvailable } = req.body; // Accept isAvailable from frontend

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    if (isAvailable === "not_available") {
      // Clear all slots if doctor is marked as not available
      await doctor.updateMultipleDateSlots({});
      doctor.isAvailable = "not_available";
      await doctor.save();

      return res.json({ 
        success: true, 
        message: "Doctor marked as not available. All slots cleared.", 
        data: {}
      });
    }

    // Normal update when doctor is available
    if (!dateSlots || typeof dateSlots !== "object") {
      return res.status(400).json({ success: false, message: "Valid dateSlots object is required" });
    }

    await doctor.updateMultipleDateSlots(dateSlots);
    doctor.isAvailable = "available"; // Ensure status is updated
    await doctor.save();

    res.json({
      success: true,
      message: "Date slots updated successfully",
      data: doctor.getAllDateSlots()
    });

  } catch (error) {
    console.error("Error updating date slots:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});


// ✅ UPDATED: Get slots for a specific date (supports both old and new methods)
router.get("/:id/slots", validateObjectId, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: "date query parameter is required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Use the new method that checks dateSlots first, then falls back to old methods
    const slots = doctor.getAvailabilityForDate(date);

    res.status(200).json({ 
      success: true, 
      data: { date, slots } 
    });
  } catch (err) {
    console.error("Error fetching slots:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ UPDATED: Update slots for a specific date (supports new dateSlots method)
router.patch("/:id/slots", validateObjectId, async (req, res) => {
  try {
    const { date, slots } = req.body;
    
    if (!date) {
      return res.status(400).json({ success: false, message: "date is required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Use the new method to set slots for specific date
    await doctor.setSlotsForDate(date, slots || []);
    
    res.json({ 
      success: true, 
      message: "Slots updated successfully",
      data: { date, slots: doctor.getAvailabilityForDate(date) }
    });
  } catch (error) {
    console.error("Error updating slots:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Clear slots for a specific date
router.delete("/:id/slots/:date", validateObjectId, async (req, res) => {
  try {
    const { date } = req.params;
    
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    await doctor.clearSlotsForDate(date);
    
    res.json({ 
      success: true, 
      message: "Slots cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing slots:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Get Doctor's availability for a specific date
router.get("/:id/availability/:date", validateObjectId, async (req, res) => {
  try {
    const { date } = req.params;
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const availability = doctor.getAvailabilityForDate(date);
    
    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.name,
        date: date,
        slots: availability
      }
    });
  } catch (error) {
    console.error("Error fetching availability for date:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Get Doctor's availability for today
router.get("/:id/availability", validateObjectId, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const availability = doctor.getTodaysAvailability();
    
    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.name,
        date: new Date().toISOString().split("T")[0],
        slots: availability
      }
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Get upcoming availability for next N days
router.get("/:id/upcoming-availability", validateObjectId, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const upcomingAvailability = doctor.getUpcomingAvailability(parseInt(days));
    
    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.name,
        upcomingSlots: upcomingAvailability
      }
    });
  } catch (error) {
    console.error("Error fetching upcoming availability:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Book a specific slot
router.patch("/:id/book-slot", validateObjectId, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "date, startTime, and endTime are required" 
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const booked = await doctor.bookSlot(date, startTime, endTime);
    
    if (booked) {
      res.json({ 
        success: true, 
        message: "Slot booked successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Slot not available or not found" 
      });
    }
  } catch (error) {
    console.error("Error booking slot:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Unbook a specific slot
router.patch("/:id/unbook-slot", validateObjectId, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "date, startTime, and endTime are required" 
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const unbooked = await doctor.unbookSlot(date, startTime, endTime);
    
    if (unbooked) {
      res.json({ 
        success: true, 
        message: "Slot unbooked successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Slot was not booked or not found" 
      });
    }
  } catch (error) {
    console.error("Error unbooking slot:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update today's availability only (backward compatibility)
router.patch("/:id/today", validateObjectId, async (req, res) => {
  try {
    const { available, slots } = req.body;
    if (available === undefined) {
      return res.status(400).json({ success: false, message: "available is required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    doctor.todaySchedule = {
      date: new Date().toISOString().slice(0, 10),
      available,
      slots: available && Array.isArray(slots) ? slots : [],
    };

    await doctor.save();
    res.status(200).json({ 
      success: true, 
      data: formatDoctorResponse(doctor) 
    });
  } catch (err) {
    console.error("Error updating today's schedule:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete doctor
router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    res.status(200).json({ success: true, message: "Doctor deleted successfully" });
  } catch (err) {
    console.error("Error deleting doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;