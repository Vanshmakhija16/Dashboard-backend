import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    mode: { type: String, enum: ["online", "offline"], default: "offline" },
    problems: String,
    analysis: String,
    metrics: String,
    nextSessionDate: Date,
    daysToAttend: Number,
    attendedDate: Date,
    assessmentSlug: { type: String }, // links to Assessment.slug
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
