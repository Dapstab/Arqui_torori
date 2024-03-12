// const nodemailer = require("nodemailer");
// const pug = require("pug");
// const htmlToText = require("html-to-text");

// const sgMail = require("@sendgrid/mail");
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// exports.sendEmail = (user, subject, text, url, template) => {
//   const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
//     firstName: user.nombre.split(" ")[0],
//     url,
//     subject,
//   });
//   const msg = {
//     to: user.correo, // Change to your recipient
//     from: process.env.EMAIL_FROM, // Change to your verified sender
//     subject,
//     text,
//     html,
//   };
//   sgMail
//     .send(msg)
//     .then(() => {
//       console.log("Email sent");
//     })
//     .catch((error) => {
//       console.error(error);
//     });
// };

// const sendEmail = async options => {
//     // 1) Createa transporter
//     const transporter = nodemailer.createTransport({
//         // service: "Gmail",
//         host: process.env.EMAIL_HOST,
//         port: process.env.EMAIL_PORT,
//         auth: {
//             user: process.env.EMAIL_USERNAME,
//             pass: process.env.EMAIL_PASSWORD
//         }

//         // Activate in gmail "less secure app" option
//     });
//    // 2) Define the email options

//    const mailOptions = {
//     from: 'UNBiters <dpovedat@unal.edu.co>',
//     to: options.correo,
//     subject: options.subject,
//     text: options.message,
//     // html:
//    }

//    // 3) Actually send the email
//    await transporter.sendMail(mailOptions)
// }
