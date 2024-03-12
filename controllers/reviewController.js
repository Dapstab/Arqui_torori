const Review = require("./../models/reviewModel");
const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");

exports.setPublicationUserIds = (req, res, next) => {
  // Allow nested routes
  //   if (!req.body.publication) req.body.publication = req.params.publicationId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id }).populate({
    path: "user",
  });
  res.status(200).json({
    status: "success",
    data: {
      reviews,
    },
  });
});
