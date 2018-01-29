const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');
const lusca = require('lusca');

const bustime = require('./bustime');


// Create Express server.
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

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
  res.sendFile(`${__dirname}/index.html`);
});

app.get('/api/init', (req, res) => {
  res.json({
    home: [+process.env.HOME_LAT, +process.env.HOME_LONG],
  })
});
app.get('/api/bus', function(req, res) {
  return bustime.myStopInfo().then(resp => {
    return res.json(resp);
  });
});


// Error Handling
app.get('*', function(req, res) {
  res.status(404).send();
});
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).send();
});

module.exports = app;
