const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {app} = require("./src/app");

setGlobalOptions({maxInstances: 10});

// A full CPU lets one instance serve many requests at once; at the default
// fractional CPU, concurrency is forced to 1 and bursts of parallel page-load
// requests exhaust maxInstances, surfacing as Cloud Run 429 "Rate exceeded.".
exports.api = onRequest({
  invoker: "public",
  cpu: 1,
  memory: "512MiB",
  concurrency: 80,
}, app);
