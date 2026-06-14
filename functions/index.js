const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {app} = require("./src/app");
const {FIREBASE_WEB_API_KEY} = require("./src/services/userService");

setGlobalOptions({maxInstances: 10});

exports.api = onRequest({
  invoker: "public",
  secrets: [FIREBASE_WEB_API_KEY],
}, app);
