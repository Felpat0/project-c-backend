const nodemailer = require("nodemailer");
//https://jasonwatmore.com/post/2020/07/20/nodejs-send-emails-via-smtp-with-nodemailer
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
