"use strict";

// TODO: This can all be refactored.
// I like having authenticate_session redirect itself w/o having to set that redirection in every subsequent auth route.
// Write a function for matching the session ID in req.cookies and from the redis client.
const jwt = require("jsonwebtoken");
const config = require("config");
const TOKEN_KEY_ACCESS = config.get("token_key_access");
const redis_client = require("../lib/redis");

async function authenticate_session(req, res, next) {
  const token = get_token(req);

  if (!token) {
    return res.status(403).redirect(`/login?next=${req.url}`);
  }
  try {
    const token_decoded = jwt.verify(token, TOKEN_KEY_ACCESS);
    const match = await session_id_match(req.cookies.session_id, token_decoded.name);
    if(!match) return res.status(403).redirect(`/login?next=${req.url}`);
    req.user = token_decoded;
  }
  catch (err) {
    return res.status(401).redirect(`/login?next=${req.url}`);
  }
  return next();
}

function get_header_token(req) {
  const auth_header = req.headers["authorization"];
  const token = auth_header && auth_header.split(" ")[1];
  return token;
}

function get_token(req) {
  return (req.cookies.token) ?
  req.cookies.token : get_header_token(req);
}

async function session_id_match(cookies_session_id, user_name) {
  const session_id_redis = await redis_client.get(user_name);
  return cookies_session_id === session_id_redis;
}

// This will run before every route. Check if user exists.
// If so, attach to the req/res objects.
async function check_if_user_exists(req, res, next) {
  const token = get_token(req);
  if(!token) {
    req.body.user = false;
    return next();
  }
  const token_decode = jwt.verify(token, TOKEN_KEY_ACCESS);
  if(!await session_id_match(req.cookies.session_id, token_decode.name)) {
    req.body.user = false;
    return next();
  }
  req.body.user = token_decode;
  next();
}

module.exports.auth = authenticate_session;
module.exports.check_if_user_exists = check_if_user_exists;
