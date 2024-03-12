const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Email = require("./../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };
  if (process.env.NODE_ENV.trim() == "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.contraseña = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    nombre: req.body.nombre,
    correo: req.body.correo,
    contraseña: req.body.contraseña,
    confirmarContraseña: req.body.confirmarContraseña,
    fechaNacimiento: req.body.fechaNacimiento,
    chaza: req.body.chaza,
    sexo: req.body.sexo,
  });

  const url = `https://unbiters.vercel.app/unbiters/profile`;
  // await new Email(newUser, url).sendWelcome();
  const subject = "Bienvenido a <nombre>";
  const text = "Hola perro";
  // await Email.sendEmail(newUser, subject, text, url, "welcome");

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { correo, contraseña } = req.body;

  // 1) Check if email and password exist
  if (!correo || !contraseña) {
    return next(new AppError("Por favor danos un correo y contraseña!", 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ correo }).select("+contraseña");

  if (!user || !(await user.correctPassword(contraseña, user.contraseña))) {
    return next(new AppError("Correo o contraseña incorrecta", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(
        "No has iniciado sesión. Inicia sesión para tener acceso",
        401
      )
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("El usuario propietario de este token ya no existe", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        "El usuario cambio la contraseña! Por favor inicia sesión de nuevo",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// // Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return next(
        new AppError("No tienes permiso para realizar esta acción", 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ correo: req.body.correo });
  if (!user) {
    return next(
      new AppError("No existe ningún usuario asociado a ese correo", 404)
    );
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    let resetUrl;
    if (process.env.NODE_ENV.trim() == "production") {
      resetURL = `https://unbiters.vercel.app/unbiters/help/reset-password/#${resetToken}`;
    }
    if (process.env.NODE_ENV.trim() == "development") {
      resetURL = `http://localhost:3001/unbiters/help/reset-password/#${resetToken}`;
    }

    /*const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;*/
    // await new Email(user, resetURL).sendPasswordReset();

    const message = `¿Olvidaste tu contraseña? Actualiza tu contraseña en el siguiente link: ${resetURL}\nSi aun recuerdas tu contraseña, por favor ignora este correo!`;

    const subject =
      "Tu token para actualizar tu contraseña (valido por 10 min)";

    // await Email.sendEmail(user, subject, message, resetURL, "passwordReset");

    res.status(200).json({
      status: "success",
      message: "Token enviado al correo!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "Hubo un error al enviar el correo. Intenta de nuevo mas tarde!"
      ),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("El token es invalido o ha expirado", 400));
  }
  user.contraseña = req.body.contraseña;
  user.confirmarContraseña = req.body.confirmarContraseña;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+contraseña");

  // 2) Check if POSTed current password is correct
  if (
    !(await user.correctPassword(req.body.contraseñaActual, user.contraseña))
  ) {
    return next(new AppError("Tu contraseña actual es incorrecta!", 401));
  }

  // 3) If so, update password
  user.contraseña = req.body.contraseña;
  user.confirmarContraseña = req.body.confirmarContraseña;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
