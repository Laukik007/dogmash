const mongoose = require("mongoose");

const dogSchema = mongoose.Schema(
  {
    Name: {
      type: String,
      required: true,
    },
    Owner: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    Rating: {
      type: Number,
      default: 1500,
    },
  },
  {
    timestamps: true,
  }
);

const dog = mongoose.model("dog", dogSchema);

module.exports = dog;
