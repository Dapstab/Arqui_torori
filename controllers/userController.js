const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const cloudinary = require("../utils/cloudinary");

const fs = require("fs-extra");

const multerStorage = multer.diskStorage({
  // destination: (req, file, cb) => {
  //   cb(null, "public/img/users");
  // },
  filename: (req, file, cb) => {
    //user-<id>-<timestamp>.jpg
    const ext = file.mimetype.split("/")[1];
    cb(null, `${file.originalname}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  console.log(file, "HOLAAAA");
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "El archivo no es una imagen! Por favor sube una imagen",
        400
      ),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single("foto");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  console.log(req.body);
  if (req.body.contraseña || req.body.confirmarContraseña) {
    return next(
      new AppError(
        "Esta ruta no se utiliza para actualizar la contraseña. Por favor use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    "nombre",
    "correo",
    "sexo",
    "fechaNacimiento"
  );
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path);
    //console.log(result)
    filteredBody.imagenUrl = result.secure_url;
    filteredBody.imagenId = result.public_id;
    await fs.unlink(req.file.path);
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user.id, { active: false });
  if (!user) {
    return next(
      new AppError("No se encontro ningun usuario para borrar.", 404)
    );
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /signup instead",
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
