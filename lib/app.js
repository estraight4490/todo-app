"use strict";

const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const cookie_parser = require("cookie-parser");
const config = require("config");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const path = require("path");
const { auth, check_if_user_exists } = require("../middleware/auth");
const { add_query_params_to_req, check_for_query_params } = require("../middleware/parse_query");
const Users = require("./Users");
const { validate_user_login, validate_user_registration } = require("../middleware/validation");
const redis_client = require("./redis");
const app = express();

const ACCESS_TOKEN_EXPIRY = config.get("access_token_expiry");
const MAX_AGE = config.get("max_age");
const SALT_ROUNDS = config.get("salt_rounds");
const TOKEN_KEY_ACCESS = config.get("token_key_access");

const cors_options = {
  origin: "https://cdn.jsdelivr.net",
  optionsSuccessStatus: 200,
};

app.use(helmet());
app.use(cors(cors_options));
app.disable("x-powered-by");
// TODO: This will need to be set to a react main file
app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");

// Set the public directory for assets
app.use(express.static("public"));

// Allows app to parse POST req bodies using JSON
app.use(express.json({ limit: "50mb" }));
// Allows app to parse POST req bodies using HTML form
app.use(express.urlencoded({extended: false}));
// Allow the use of cookies
app.use(cookie_parser());

const posts = [
  {
    username: "Erik",
    title: "Post 1",
  },
  {
    username: "Nozomi",
    title: "Post 2",
  },
];

app.use(check_if_user_exists);

app.get("/posts", auth, (req, res) => {
  res.status(200).render("posts", {
    posts: posts.filter(post => post.username === req.user.name),
    user: req.body.user,
    active_link: req.url,
  });
});

app.get("/", (req, res) => {
  res.status(200).render("home", {
    user: req.body.user,
    active_link: req.url,
  });
});

app.get("/register", add_query_params_to_req, validate_user_registration, async (req, res) => {
  if(req.body.email === "@" &&
  req.body.password === "" &&
  req.body.username === "" &&
  req.body.password_confirmation === "") {

    return res.status(200).render("register", {
      user: req.body.user,
      active_link: req.url,
    });
  }

  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).render("register", {
      errors: errors.array(),
      user: req.body.user,
      active_link: req.url,
    });
  }
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const hashed_pwd = await bcrypt.hash(password, SALT_ROUNDS);

  const registered_user = await Users.add_user(username, email, hashed_pwd);
  res.status(302).redirect("/login");
});

app.get("/login", add_query_params_to_req, validate_user_login, async (req, res) => {
  // User has not submitted login credentials, only navigated to the login page
  const next = req.query.next || "/";
  if(req.body.email === "@" && req.body.password === "") {
    return res.status(200).render("login", {
      next,
      user: req.body.user,
      active_link: req.url,
    });
  }
  const errors = validationResult(req);
  // TODO: Render /login page with errors attached to response.
  if(!errors.isEmpty()) return res.status(400).render("login", {
    next,
    errors: errors.array(),
    user: req.body.user,
    active_link: req.url,
  });

  const email = req.body.email;
  const password = req.body.password;

  const user = await Users.get_user(email);
  if (user.length === 0) return res.status(401).render("login", {
    next,
    errors: [{msg: "Bad username or password."}],
    user: req.body.user,
    active_link: req.url,
  });
  const matched_result = await bcrypt.compare(password, user[0].password);
  if (!matched_result) return res.status(401).render("login", {
    next,
    errors: [{msg: "Bad username or password."}],
    user: req.body.user,
    active_link: req.url,
  });

  const user_signature = {
    id: user[0].id,
    name: user[0].username,
    email: user[0].email,
  };

  const access_token = generate_access_token(user_signature);
  // Generate session ID to be stored in a cookie and also be deleted on logout.
  // This will prevent a still active token from being used after logout.
  res.cookie("token", access_token, {
    maxAge: MAX_AGE,
    httpOnly: true,
  });

  // TODO: Set the session id to something a little more robust.
  await redis_client.set(user[0].username, user[0].id);
  const session_value = await redis_client.get(user[0].username);
  res.cookie("session_id", session_value, {
    maxAge: MAX_AGE,
    httpOnly: true,
  });

  res.redirect(req.body.redirect);
});

// After authenticating user, this will generate and send an access token
// TODO: Check for query params and validate/redirect.
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
    id: user[0].id,
    name: user[0].username,
    email: user[0].email,
  };

  const access_token = generate_access_token(user_signature);
  // TODO: Attach name, email and token to the req body and redirect (redirect URI should be in the login request)
  res.json({access_token});
});

app.get("/logout", auth, async (req, res) => {
  res.clearCookie("token");
  res.clearCookie("session_id");
  await redis_client.del(req.user.name);
  res.redirect("/");
});

// TODO: The user object should contain the user id, username and email
// Assuming the user is registered, all this data will be available in the db
function generate_access_token(user) {
  return jwt.sign(user, TOKEN_KEY_ACCESS, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

module.exports = app;
