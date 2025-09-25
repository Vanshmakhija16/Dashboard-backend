import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    slotStart: {
      type: Date,
      required: true,
    },
    slotEnd: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      enum: ["Online", "Offline"],
      required: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["approved", "completed", "cancelled"], // simplified for auto-booking
      default: "approved",
    },
    completedAt: { type: Date, default: null },

    allottedDate: {
      type: Date, // optional override by admin, kept for backward compatibility
    },
  },
  { timestamps: true }
);

// Virtual field to easily check if a session is booked
sessionSchema.virtual("isBooked").get(function () {
  return this.status === "booked";
});

const Session = mongoose.model("Session", sessionSchema);
export default Session;
