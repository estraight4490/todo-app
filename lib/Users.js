"use strict";
const { database_connection: db } = require("./database");
const USER_TABLE_NAME = "users";

class User {

  static async add_user(username, email, password) {
    try {
      const results = await db(USER_TABLE_NAME).insert({
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

  static async get_user(email_or_id, condition="email") {
    try {
      // Returns empty array if no results. Returns array with object in array containing user info
      return await db(USER_TABLE_NAME).where(condition, email_or_id);
    }
    catch (err) {
      console.log("ERROR");
      console.log(err);
      throw err;
    }
  }
  
  static async remove_user(email) {
    try {
      return await db(USER_TABLE_NAME).where("email", email).del();
    }
    catch (err) {
      console.log("ERROR");
      console.log(err);
      throw err;
    }
  }
  
  static async check_user_exists(username) {
    try {
      const user = await db(USER_TABLE_NAME).where("username", username);
      return (user.length > 0) ? true : false;
    }
    catch (err) {
      console.log("ERROR");
      console.log(err);
      throw err;
    }
  }

}

module.exports = User;
