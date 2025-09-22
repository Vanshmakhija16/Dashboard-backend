import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ✅ Time slot schema
const timeSlotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // "HH:MM"
  endTime: { type: String, required: true },   // "HH:MM"
  isAvailable: { type: Boolean, default: true }
});

// ✅ Daily schedule schema for weeklySchedule
const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  },
  slots: { type: [timeSlotSchema], default: [] }
});

// ✅ Schema for today's schedule
const todayScheduleSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  available: { type: Boolean, default: false },
  slots: { type: [timeSlotSchema], default: [] }
});

// ✅ NEW: Schema for date-specific slots (supports multiple dates)
const dateSlotSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  slots: { type: [timeSlotSchema], default: [] }
});

// ✅ Doctor schema
const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    password: { type: String, required: false }, // For login
    role: { type: String, enum: ["doctor", "admin"], default: "doctor" },

    experience: { type: Number },
    fees: { type: Number },
    hospital: { type: String },
    availabilityType: {
      type: String,
      enum: ["online", "offline", "both"],
      default: "both"
    },

    // NEW: Global availability flag
    isAvailable: {
      type: String,
      enum: ["available", "not_available"],
      default: "available"
    },

    // Weekly recurring schedule
    weeklySchedule: { type: [dayScheduleSchema], default: [] },

    // Today's specific schedule
    todaySchedule: {
      type: todayScheduleSchema,
      default: () => ({
        date: new Date().toISOString().split("T")[0],
        available: false,
        slots: []
      })
    },

    // Multi-date specific slots
    dateSlots: {
      type: Map,
      of: [timeSlotSchema],
      default: new Map()
    },

    universities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "University"
      }
    ]
  },
  { timestamps: true }
);


// ✅ Ensure universities array has valid ObjectIds before saving
doctorSchema.pre('save', async function (next) {
  if (this.universities) {
    this.universities = this.universities.filter(id => mongoose.Types.ObjectId.isValid(id));
  }

  // Hash password only if modified and not already a bcrypt hash
  if (this.isModified('password') && !this.password.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// ✅ Helper methods
doctorSchema.methods.addUniversity = async function (universityId) {
  if (!this.universities.includes(universityId)) {
    this.universities.push(universityId);
    await this.save();
  }
};

doctorSchema.methods.removeUniversity = async function (universityId) {
  this.universities = this.universities.filter(
    (id) => id.toString() !== universityId.toString()
  );
  await this.save();
};

// ✅ UPDATED: Get availability for any specific date
doctorSchema.methods.getAvailabilityForDate = function (date) {
  // Check date-specific slots first (highest priority)
  if (this.dateSlots && this.dateSlots.has(date)) {
    return this.dateSlots.get(date).filter(s => s.isAvailable);
  }
  
  // Fallback to today's schedule if it matches
  if (this.todaySchedule && this.todaySchedule.date === date && this.todaySchedule.available) {
    return this.todaySchedule.slots.filter(s => s.isAvailable);
  }

  // Fallback to weekly schedule
  const dateObj = new Date(date);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayName = days[dateObj.getDay()];
  const weeklyDay = this.weeklySchedule.find(s => s.day === dayName);
  
  return weeklyDay ? weeklyDay.slots.filter(s => s.isAvailable) : [];
};

// ✅ UPDATED: Get today's availability (backward compatibility)
doctorSchema.methods.getTodaysAvailability = function () {
  const todayDate = new Date().toISOString().split("T")[0];
  return this.getAvailabilityForDate(todayDate);
};

// ✅ NEW: Set slots for a specific date
doctorSchema.methods.setSlotsForDate = async function (date, slots) {
  if (!this.dateSlots) {
    this.dateSlots = new Map();
  }
  this.dateSlots.set(date, slots);
  this.markModified('dateSlots');
  await this.save();
};

// ✅ NEW: Get all date-specific slots
doctorSchema.methods.getAllDateSlots = function () {
  if (!this.dateSlots) return {};
  
  const result = {};
  for (const [date, slots] of this.dateSlots.entries()) {
    result[date] = slots.filter(s => s.isAvailable);
  }
  return result;
};

// ✅ NEW: Clear slots for a specific date
doctorSchema.methods.clearSlotsForDate = async function (date) {
  if (this.dateSlots && this.dateSlots.has(date)) {
    this.dateSlots.delete(date);
    this.markModified('dateSlots');
    await this.save();
  }
};

// ✅ NEW: Update multiple date slots at once
doctorSchema.methods.updateMultipleDateSlots = async function (dateSlotMap) {
  if (!this.dateSlots) {
    this.dateSlots = new Map();
  }
  
  for (const [date, slots] of Object.entries(dateSlotMap)) {
    if (slots && slots.length > 0) {
      this.dateSlots.set(date, slots);
    } else {
      this.dateSlots.delete(date);
    }
  }
  
  this.markModified('dateSlots');
  await this.save();
};

// ✅ NEW: Get available slots for the next N days
doctorSchema.methods.getUpcomingAvailability = function (days = 7) {
  const result = {};
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    
    const slots = this.getAvailabilityForDate(dateStr);
    if (slots && slots.length > 0) {
      result[dateStr] = slots;
    }
  }
  
  return result;
};

// ✅ NEW: Check if doctor is available on a specific date and time
doctorSchema.methods.isAvailableAtDateTime = function (date, startTime, endTime) {
  const slots = this.getAvailabilityForDate(date);
  
  return slots.some(slot => 
    slot.startTime <= startTime && 
    slot.endTime >= endTime && 
    slot.isAvailable
  );
};

// ✅ NEW: Book a slot (mark as unavailable)
doctorSchema.methods.bookSlot = async function (date, startTime, endTime) {
  if (!this.dateSlots) {
    this.dateSlots = new Map();
  }
  
  const slots = this.dateSlots.get(date) || [];
  const slotIndex = slots.findIndex(slot => 
    slot.startTime === startTime && slot.endTime === endTime
  );
  
  if (slotIndex !== -1 && slots[slotIndex].isAvailable) {
    slots[slotIndex].isAvailable = false;
    this.dateSlots.set(date, slots);
    this.markModified('dateSlots');
    await this.save();
    return true;
  }
  
  return false;
};

// ✅ NEW: Unbook a slot (mark as available)
doctorSchema.methods.unbookSlot = async function (date, startTime, endTime) {
  if (!this.dateSlots || !this.dateSlots.has(date)) {
    return false;
  }
  
  const slots = this.dateSlots.get(date);
  const slotIndex = slots.findIndex(slot => 
    slot.startTime === startTime && slot.endTime === endTime
  );
  
  if (slotIndex !== -1 && !slots[slotIndex].isAvailable) {
    slots[slotIndex].isAvailable = true;
    this.dateSlots.set(date, slots);
    this.markModified('dateSlots');
    await this.save();
    return true;
  }
  
  return false;
};

// ✅ NEW: Get total available slots count for a date
doctorSchema.methods.getAvailableSlotsCount = function (date) {
  const slots = this.getAvailabilityForDate(date);
  return slots.length;
};

// ✅ NEW: Get all dates that have slots defined
doctorSchema.methods.getDatesWithSlots = function () {
  if (!this.dateSlots) return [];
  
  return Array.from(this.dateSlots.keys()).sort();
};

// ✅ Compare password method
doctorSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ✅ Transform function to include dateSlots in JSON output
doctorSchema.set('toJSON', {
  transform: function(doc, ret) {
    if (ret.dateSlots) {
      // Convert Map to Object for JSON serialization
      const dateSlotObj = {};
      for (const [key, value] of ret.dateSlots.entries()) {
        dateSlotObj[key] = value;
      }
      ret.slots = dateSlotObj; // This will be accessible as doctor.slots in frontend
      ret.dateSlots = dateSlotObj; // Keep both for compatibility
    }
    return ret;
  }
});

// ✅ Index for better performance
doctorSchema.index({ email: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ availabilityType: 1 });
doctorSchema.index({ "universities": 1 });

export default mongoose.model("Doctor", doctorSchema);