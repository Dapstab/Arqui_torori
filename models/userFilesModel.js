const mongoose = require("mongoose");
const AppError = require("../utils/appError");

function validateMimeType(mimeType) {
  const allowedMimeTypes = ["image/jpeg", "image/svg+xml, image/png"];
  return allowedMimeTypes.includes(mimeType);
}

const userFilesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "El archivo de imagen debe estar asociado a un usuario"],
    },
    filename: {
      type: String,
      required: [true, "El archivo debe tener un nombre"],
    },
    mimeType: {
      type: String,
      required: [true, "El archivo debe tener una extensión"],
      validate: {
        validator: validateMimeType,
        message:
          "Tipo de archivo no permitido. Solo se admiten jpg, svg y png.",
      },
    },
    filesize: {
      type: Number,
      required: [true, "Todo archivo debe tener un peso asociado"],
    },
    width: {
      type: Number,
      required: [true, "Toda imagen debe tener un ancho"],
    },
    height: {
      type: Number,
      required: [true, "Toda imagen debe tener un alto"],
    },
  },
  {
    timestamps: true,
  }
);

const Userfiles = mongoose.model("Userfiles", userFilesSchema);
module.exports = Userfiles;
