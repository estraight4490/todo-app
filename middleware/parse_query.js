"use strict";

function add_query_params_to_req(req, res, next) {
  req.body = req.query;
  next();
}

function check_for_query_params(req, res, next) {
  if(!req.query.username && !req.query.password) {
    const next_link = req.query.next || "/posts";
    return res.status(200).render("/login", { next: next_link });
  } 
  next();
}

module.exports.add_query_params_to_req = add_query_params_to_req;
module.exports.check_for_query_params = check_for_query_params;
