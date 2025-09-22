import mongoose from "mongoose";

// Define User schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: {
    type: String,
    required: function () {
      return this.role === "student"; // required only if user is a student
      },
    },

    role: {
      type: String,
      enum: ["student", "admin", "university_admin"],
      default: "student",
      lowercase: true,
    },
    leaveBalance: { type: Number, default: 12 },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University", // Reference University collection
      required: function () {
        return this.role === "student";
      }, // Required for students
    },
    // Add verification and approval fields
    isVerified: {
      type: Boolean,
      default: false,
      // You may implement logic to verify email ownership via token or other methods
    },
    isApproved: {
      type: Boolean,
      default: false,
      // For admin approval before full access (optional but recommended)
    },
    verificationToken: {
      type: String,
      default: null,
      // Token used for email verification (optional)
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (this.role) this.role = this.role.toLowerCase();
  next();
});

export default mongoose.model("User", userSchema);
