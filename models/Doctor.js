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
    imageUrl: { type: String, default: "" },
    fees: { type: Number },
    hospital: { type: String },
    availabilityType: { type: String, enum: ["online", "offline", "both"], default: "both" },
    isAvailable: { type: String, enum: ["available", "not_available"], default: "available" },
    weeklySchedule: { type: [dayScheduleSchema], default: [] },
    todaySchedule: {
      type: todayScheduleSchema,
      default: () => ({
        date: new Date().toISOString().split("T")[0],
        available: false,
        slots: []
      })
    },
    dateSlots: { type: Map, of: [timeSlotSchema], default: new Map() },
    universities: [{ type: mongoose.Schema.Types.ObjectId, ref: "University" }]
  },
  { timestamps: true }
);

// ✅ Pre-save hooks
doctorSchema.pre('save', async function (next) {
  if (this.universities) {
    this.universities = this.universities.filter(id => mongoose.Types.ObjectId.isValid(id));
  }

  if (this.isModified('password') && this.password && !this.password.startsWith('$2b$')) {
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
  this.universities = this.universities.filter(id => id.toString() !== universityId.toString());
  await this.save();
};

// ✅ Get availability for a specific date
doctorSchema.methods.getAvailabilityForDate = function (date) {
  // Check dateSlots first
  if (this.dateSlots && this.dateSlots.has(date)) {
    return this.dateSlots.get(date).filter(s => s.isAvailable);
  }

  // Generate today’s slots if missing
  const todayDate = new Date().toISOString().split("T")[0];
  if (date === todayDate && this.weeklySchedule && this.weeklySchedule.length > 0) {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayName = days[new Date().getDay()];
    const weeklyDay = this.weeklySchedule.find(s => s.day === dayName);
    if (weeklyDay && weeklyDay.slots.length > 0) {
      const slotsCopy = weeklyDay.slots.map(s => ({...s.toObject(), isAvailable: true}));
      this.dateSlots.set(date, slotsCopy);
      this.markModified('dateSlots');
      this.save(); // async
      return slotsCopy;
    }
  }

  // Fallback to todaySchedule if matches
  if (this.todaySchedule && this.todaySchedule.date === date && this.todaySchedule.available) {
    return this.todaySchedule.slots.filter(s => s.isAvailable);
  }

  // Fallback to weeklySchedule
  const dateObj = new Date(date);
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dateObj.getDay()];
  const weeklyDay = this.weeklySchedule.find(s => s.day === dayName);
  return weeklyDay ? weeklyDay.slots.filter(s => s.isAvailable) : [];
};

// ✅ Get today’s availability (backward compatibility)
doctorSchema.methods.getTodaysAvailability = function () {
  const todayDate = new Date().toISOString().split("T")[0];
  return this.getAvailabilityForDate(todayDate);
};

// ✅ Set slots for a specific date
doctorSchema.methods.setSlotsForDate = async function (date, slots) {
  if (!this.dateSlots) this.dateSlots = new Map();
  this.dateSlots.set(date, slots);
  this.markModified('dateSlots');
  await this.save();
};

// ✅ Get all date-specific slots
doctorSchema.methods.getAllDateSlots = function () {
  if (!this.dateSlots) return {};
  const result = {};
  for (const [date, slots] of this.dateSlots.entries()) {
    result[date] = slots.filter(s => s.isAvailable);
  }
  return result;
};

// ✅ Clear slots for a specific date
doctorSchema.methods.clearSlotsForDate = async function (date) {
  if (this.dateSlots && this.dateSlots.has(date)) {
    this.dateSlots.delete(date);
    this.markModified('dateSlots');
    await this.save();
  }
};

// ✅ Update multiple date slots at once
doctorSchema.methods.updateMultipleDateSlots = async function (dateSlotMap) {
  if (!this.dateSlots) this.dateSlots = new Map();

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

// ✅ Get available slots for next N days
doctorSchema.methods.getUpcomingAvailability = function (days = 7) {
  const result = {};
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const slots = this.getAvailabilityForDate(dateStr);
    if (slots && slots.length > 0) result[dateStr] = slots;
  }
  return result;
};

// ✅ Check if available at specific date/time
doctorSchema.methods.isAvailableAtDateTime = function (date, startTime, endTime) {
  console.log("🔍 isAvailableAtDateTime called with:", { date, start, end });
  console.log("📌 Slots stored for this date:", this.dateSlots[date]);
  const slots = this.getAvailabilityForDate(date);
  return slots.some(slot => slot.startTime <= startTime && slot.endTime >= endTime && slot.isAvailable);
};

// ✅ Book a slot
doctorSchema.methods.bookSlot = async function (date, startTime, endTime) {
  if (!this.dateSlots) this.dateSlots = new Map();

  if (!this.dateSlots.has(date)) {
    // Generate from weekly schedule if missing
    const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(date).getDay()];
    const weeklyDay = this.weeklySchedule.find(s => s.day === dayName);
    this.dateSlots.set(date, weeklyDay ? weeklyDay.slots.map(s => ({...s.toObject(), isAvailable: true})) : []);
  }

  const slots = this.dateSlots.get(date);
  const slotIndex = slots.findIndex(slot => slot.startTime === startTime && slot.endTime === endTime);
  if (slotIndex !== -1 && slots[slotIndex].isAvailable) {
    slots[slotIndex].isAvailable = false;
    this.dateSlots.set(date, slots);
    this.markModified('dateSlots');
    await this.save();
    return true;
  }

  return false;
};

// ✅ Unbook a slot
doctorSchema.methods.unbookSlot = async function (date, startTime, endTime) {
  if (!this.dateSlots || !this.dateSlots.has(date)) return false;
  const slots = this.dateSlots.get(date);
  const slotIndex = slots.findIndex(slot => slot.startTime === startTime && slot.endTime === endTime);
  if (slotIndex !== -1 && !slots[slotIndex].isAvailable) {
    slots[slotIndex].isAvailable = true;
    this.dateSlots.set(date, slots);
    this.markModified('dateSlots');
    await this.save();
    return true;
  }
  return false;
};

// ✅ Get total available slots for a date
doctorSchema.methods.getAvailableSlotsCount = function (date) {
  const slots = this.getAvailabilityForDate(date);
  return slots.length;
};

// ✅ Get all dates that have slots defined
doctorSchema.methods.getDatesWithSlots = function () {
  if (!this.dateSlots) return [];
  return Array.from(this.dateSlots.keys()).sort();
};

// ✅ Compare password
doctorSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ✅ Transform for JSON output
doctorSchema.set('toJSON', {
  transform: function(doc, ret) {
    if (ret.dateSlots) {
      const dateSlotObj = {};
      for (const [key, value] of ret.dateSlots.entries()) {
        dateSlotObj[key] = value;
      }
      ret.slots = dateSlotObj;
      ret.dateSlots = dateSlotObj;
    }
    return ret;
  }
});

// ✅ Indexes
doctorSchema.index({ email: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ availabilityType: 1 });
doctorSchema.index({ "universities": 1 });

export default mongoose.model("Doctor", doctorSchema);
