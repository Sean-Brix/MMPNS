const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {app} = require("./src/app");
const {MMPNS_AUTH_SECRET} = require("./src/services/sessionService");

setGlobalOptions({maxInstances: 10});

exports.api = onRequest({
  invoker: "public",
  secrets: [MMPNS_AUTH_SECRET],
}, app);
