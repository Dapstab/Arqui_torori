const mongoose = require("mongoose");
// const Publication = require('./publicationModel');
// const searchController = require("../controllers/searchController");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Por favor escribe un comentario antes de publicarlo"],
    },
    // publication: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: "Publication",
    //   required: [true, "El comentario debe estar asociado a una publicación"],
    // },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "El comentario debe estar asociado a un usuario"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "nombre foto",
  });
  next();
});

reviewSchema.statics.calcReviews = async function (publicationId) {
  const stats = await this.aggregate([
    {
      $match: { publication: publicationId },
    },
    {
      $group: {
        _id: "$publication",
        numReviews: { $sum: 1 },
      },
    },
  ]);
  if (stats.length > 0) {
    await Publication.findByIdAndUpdate(publicationId, {
      numComentarios: stats[0].numReviews,
    });
  } else {
    await Publication.findByIdAndUpdate(publicationId, {
      numComentarios: 0,
    });
  }
  const updatedPublication =
    await Publication.findById(publicationId).populate("reviews");
  searchController.updateDocuments("Publication", publicationId, {
    numComentarios: updatedPublication.numComentarios,
    reviews: updatedPublication.reviews,
  });
};

// reviewSchema.post("save", function () {
//   // this points to current review
//   this.constructor.calcReviews(this.publication);
// });

// likeSchema.pre(/^findOneAnd/, async function(next) {
//   this.r = await this.findOne();
//   console.log(this.r);
//   next();
// });

// reviewSchema.post(/^findOneAnd/, async function (doc) {
//   // await this.findOne(); does NOT work here, query has already executed
//   await doc.constructor.calcReviews(doc.publication);
// });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
