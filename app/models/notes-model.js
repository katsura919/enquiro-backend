const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema(
  {
    escalationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escalation",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
notesSchema.index({ escalationId: 1, createdAt: -1 });
notesSchema.index({ createdAt: -1 });
notesSchema.index({ createdBy: 1 });

// Instance method to check if note is recent (within last 24 hours)
notesSchema.methods.isRecent = function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > oneDayAgo;
};

// Static method to find notes by escalation with pagination
notesSchema.statics.findByEscalation = function (escalationId, options = {}) {
  const { page = 1, limit = 10 } = options;

  const query = { escalationId };

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();
};

// Static method to get note statistics for an escalation
notesSchema.statics.getEscalationStats = function (escalationId) {
  return this.aggregate([
    { $match: { escalationId: new mongoose.Types.ObjectId(escalationId) } },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        lastNoteDate: { $max: "$createdAt" },
      },
    },
  ]);
};

// Pre-save middleware to update escalation's updatedAt when note is added
notesSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      await mongoose
        .model("Escalation")
        .findByIdAndUpdate(this.escalationId, { updatedAt: new Date() });
    } catch (error) {
      console.error("Error updating escalation timestamp:", error);
    }
  }
  next();
});

module.exports = mongoose.model("Notes", notesSchema);
