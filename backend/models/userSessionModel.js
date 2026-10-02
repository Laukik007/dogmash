const mongoose = require("mongoose");

const userSessionSchema = mongoose.Schema(
  {
    // Anonymized fingerprint: hash of IP + user-agent (never store raw IP)
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Total sessions / visits
    sessionCount: {
      type: Number,
      default: 1,
    },
    // Total votes cast
    totalVotes: {
      type: Number,
      default: 0,
    },
    // Dictionary: { [candidateId]: voteCount }
    votesFor: {
      type: Map,
      of: Number,
      default: {},
    },
    // Last vote timestamp (for 24h cooldown reference)
    lastVotedAt: {
      type: Date,
      default: null,
    },
    // Last visit timestamp
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const UserSession = mongoose.model("UserSession", userSessionSchema);

module.exports = UserSession;
