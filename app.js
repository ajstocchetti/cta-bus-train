const express = require('express');
const helmet = require('helmet');
const lusca = require('lusca');

const bustime = require('./bustime');
const trains = require('./trains');

const sendJson = res => data => res.json(data);
const sendFail = res => error => res.status(500).json({error: error.toString()});

// Create Express server.
const app = express();

// Security
app.use(helmet());
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));

// // https redirect
// if (process.env.IS_PROD) {
//   app.use(function(req, res, next) {
//     if (!req.secure) {
//       res.redirect(`https://${req.hostname}${req.originalUrl}`);
//     }
//     else next();
//   });
// }

app.use(express.static(`${__dirname}/public`));

app.get('/', function(req, res) {
  res.sendFile(`${__dirname}/public/index.html`);
});

app.get('/api/bus', function(req, res) {
  if (!req.query.stops) {
    return res.status(400).json({error: 'Missing required property "stops"'});
  }
  return bustime.getVehiclesForStops(req.query.stops.split(','))
  .then(sendJson(res))
  .catch(sendFail(res));
});
// app.get('/api/trains', function(req, res) {
//   return trains.myStopInfo(req.query.stops.split(',')).then(sendJson(res));
// });


// Error Handling
app.get('*', function(req, res) {
  res.status(404).send();
});
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).send();
});

module.exports = app;
