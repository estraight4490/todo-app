"use strict";

const bcrypt = require("bcrypt");
const config = require("config");
const { body, validationResult } = require("express-validator");
const { validate_user_login } = require("../middleware/validation");
const express = require("express");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const Users = require("./Users");
const app = express();

const TOKEN_KEY_ACCESS = config.get("token_key_access");
const TOKEN_KEY_REFRESH = config.get("token_key_refresh");


// TODO: This will need to be set to a react main file
// app.set("views", path.join(__dirname, "..", "views"));
// app.set("view engine", "ejs");
app.use(helmet());
app.disable("x-powered-by");

// Allows app to parse POST req bodies using JSON
app.use(express.json({ limit: "50mb" }));
// Allows app to parse POST req bodies using HTML form
app.use(express.urlencoded({extended: false}));

const refresh_tokens = [];

// Check if refresh token exists. If so, generate new access token
app.post("/token", (req, res) => {
  const refresh_token = req.body.token;
  if(refresh_token === null) return res.sendStatus(401);
  if(!refresh_tokens.includes(refresh_token)) return res.sendStatus(403);
  jwt.verify(refresh_token, TOKEN_KEY_REFRESH, (err, user) => {
    if (err) return res.sendStatus(403);
    const access_token = generate_access_token({name: user.name });
    res.json({access_token});
  });
});

// After authenticating user, this will generate and send an access token and a refresh token
// The refresh token is pushed to an array of refresh tokens to be validated against in the /tokens route
app.post("/login", validate_user_login, async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const email = req.body.email;
  const password = req.body.password;

  const user = await Users.get_user(email);
  if (user.length === 0) return res.sendStatus(401);
  const matched_result = await bcrypt.compare(password, user[0].password);
  if (!matched_result) return res.sendStatus(401);

  const user_signature = {
    name: user[0].username,
  };

  const access_token = generate_access_token(user_signature);
  const refresh_token = jwt.sign(user_signature, TOKEN_KEY_REFRESH);
  refresh_tokens.push(refresh_token);
  res.json({access_token, refresh_token});
});

// When user logs out, delete their refresh token so access tokens can no longer be generated
app.delete("/logout", (req, res) => {
  refresh_tokens = refresh_tokens.filter(token => token !== req.body.token);
  res.sendStatus(204);
});

function generate_access_token(user) {
  return jwt.sign(user, TOKEN_KEY_ACCESS, { expiresIn: "15s" });
}

module.exports = app;