"use strict";
const { createClient } = require("redis");
const redis_client = createClient();

redis_client.on("error", err => console.log("Redis Client Error", err));

redis_client.connect();

module.exports = redis_client;
