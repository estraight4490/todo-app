"use strict";
const knex = require("knex");
const config = require("config");

const database_connection = knex(config.get("db_connect_config"));
const user_table_name = "users";

async function add_user(username, email, password) {
  try {
    const results = await database_connection(user_table_name).insert({
      username,
      email,
      password,
    });
    return results;
  }
  catch (err) {
    console.log("ERROR");
    console.log(err);
    throw err;
  }
}

async function get_user(email_or_id, condition="email") {
  try {
    // Returns empty array if no results. Returns array with object in array containing user info
    return await database_connection(user_table_name).where(condition, email_or_id);
  }
  catch (err) {
    console.log("ERROR");
    console.log(err);
    throw err;
  }
}

async function remove_user(email) {
  try {
    return await database_connection(user_table_name).where("email", email).del();
  }
  catch (err) {
    console.log("ERROR");
    console.log(err);
    throw err;
  }
}

async function check_user_exists(username) {
  try {
    console.log("CHECKING IF USER EXISTS");
    const user = await database_connection(user_table_name).where(username, "username");
    console.log(user);
    return (user.length > 0) ? true : false;
  }
  catch (err) {
    console.log("ERROR");
    console.log(err);
    throw err;
  }
}

module.exports.database_connection = database_connection;
module.exports.add_user = add_user;
module.exports.get_user = get_user;
module.exports.remove_user = remove_user;
module.exports.check_user_exists = check_user_exists;
