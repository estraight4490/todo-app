"use strict";
const auth_app = require("./lib/auth_app");
const PORT = process.env.PORT || 4000;

auth_app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});