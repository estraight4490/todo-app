"use strict";

const { body } = require("express-validator");
const Users = require("../lib/Users");

const validate_user_registration = [
  body("username").isLength({ min: 5 }).trim().escape().withMessage("Invalid Username"),
  body("email").isEmail().normalizeEmail().withMessage("Email format is not correct.")
  .custom(async email => {
    const user_check = await Users.get_user(email);
    if (user_check.length !== 0) throw new Error("A user registered with that email already exists.");
    return true;
  }),
  body("password").isLength({ min: 5 }).trim().escape().withMessage("Password is required"),
  body("password_confirmation").trim().escape()
  .custom((pwd_conf, { req }) => {
    console.log(req.body.password_confirmation);
    if(pwd_conf !== req.body.password) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }).withMessage("You must confirm your password"),
];

const validate_user_login = [
  body("email").isEmail().normalizeEmail().withMessage("Email is required."),
  body("password").isLength({ min: 5 }).trim().escape().withMessage("Password is required"),
];

module.exports.validate_user_registration = validate_user_registration;
module.exports.validate_user_login = validate_user_login;
