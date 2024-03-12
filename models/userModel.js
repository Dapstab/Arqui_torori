const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "Por favor dinos tu nombre!"],
    },
    correo: {
      type: String,
      required: [true, "Por favor dinos tu correo"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Por favor dinos tu correo valido"],
    },
    sexo: {
      type: String,
      enum: ["M", "F", "Otro"],
    },
    foto: {
      type: String,
      default: "default.jpg",
    },
    rol: {
      type: String,
      enum: ["usuario", "chazaUser", "admin"],
      default: "usuario",
    },
    contraseña: {
      type: String,
      required: [true, "Por favor escribe una contraseña"],
      minlength: [8, "La contraseña debe ser de mínimo 8 caracteres"],
      select: false,
    },
    confirmarContraseña: {
      type: String,
      required: [true, "Por favor confirma tu contraseña"],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.contraseña;
        },
        message: "Las contraseñas no coinciden!",
      },
    },
    fechaNacimiento: {
      type: Date,
      validate: {
        validator: function (fechaNacimiento) {
          // Validar la edad aquí
          const hoy = new Date();
          const edadMinima = 12;

          const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
          const m = hoy.getMonth() - fechaNacimiento.getMonth();

          return m > 0 ||
            (m === 0 && hoy.getDate() >= fechaNacimiento.getDate())
            ? edad >= edadMinima
            : edad >= edadMinima - 1;
        },
        message: "El usuario debe tener al menos 12 años de edad.",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    cliente: {
      type: Boolean,
      default: false,
    },
    nivelSuscripcion: {
      type: Number,
      default: 0,
    },
    imagenUrl: {
      type: String,
    },
    imagenId: {
      type: String,
    },
    googleId: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

userSchema.statics.calcAge = function (birthDate) {
  const hoy = new Date();
  const fechaNacimiento = new Date(birthDate);
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const m = hoy.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  return edad;
};

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("contraseña")) return next();

  // Hash the password with cost of 12
  this.contraseña = await bcrypt.hash(this.contraseña, 12);

  // Delete passwordConfirm field
  this.confirmarContraseña = undefined;
  next();
});

userSchema.virtual("edad").get(function () {
  if (this.fechaNacimiento) {
    return this.constructor.calcAge(this.fechaNacimiento);
  }
  return null;
});

userSchema.pre("save", function (next) {
  if (this.fechaNacimiento) {
    const edad = this.constructor.calcAge(this.fechaNacimiento);
    if (edad < 12) {
      return next(new AppError("Debes tener al menos 12 años.", 403));
    }
  }
  next();
});

// Si quisiera actualizar un campo siendo pero aplicando restriccciones
// userSchema.pre(/^find/, function (next) {
//   if (this._update && this._update.fechaNacimiento) {
//     const edad = this.model.calcAge(this._update.fechaNacimiento);
//     if (edad < 12) {
//       return next(new AppError("Debes tener al menos 12 años.", 403));
//     }
//   }
//   next();
// });

userSchema.pre("save", function (next) {
  if (!this.isModified("contraseña") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Siempre que haga una busqueda voy a realizarla por aquellos cuyo estado sea activo, esto incluye actualizaciones:

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
