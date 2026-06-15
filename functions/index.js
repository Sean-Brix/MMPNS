const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {app} = require("./src/app");

setGlobalOptions({maxInstances: 10});

exports.api = onRequest({invoker: "public"}, app);
