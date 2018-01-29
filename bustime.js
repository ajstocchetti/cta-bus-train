require('dotenv').config();
const request = require('request');
const moment = require('moment');

const myStops = process.env.BUS_STOPS.split(',');

module.exports = {
  myStopInfo,
};

const baseUrl = 'http://www.ctabustracker.com/bustime/api/v2/';
const busKey = process.env.BUSKEY;

function simplifyParams(obj) {
  let base = {
    key: busKey,
    format: 'json',
  };
  if (obj && typeof obj === 'object') {
    base = Object.assign(obj, base);
  }

  let params = '';
  for (key in base) {
    if (params) {
      params += `&${key}=${base[key]}`;
    } else {
      params += `?${key}=${base[key]}`;
    }
  }
  return params;
}

function getBusInfo(type, params) {
    const url = `${baseUrl}${type}${simplifyParams(params)}`;
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        if (error) reject(error);
        else if (response.statusCode > 399) reject(response);
        else resolve(JSON.parse(body)['bustime-response']);
      });
    });
}


function myStopInfo() {
  let predictions, vehicles;
  const errors = {};

  return getPredictions(myStops)
  .then(resp => {
    predictions = resp.prd;
    if (resp.error) errors.predictions = resp.error;
    return predictions.map(pred => pred.vid);
  })
  .then(getVehicles)
  .then(resp => {
    vehicles = resp.vehicle;
    if (resp.error) errors.vehicles = resp.error;
  }).then(() => cacheInfo(predictions, vehicles, errors))
  .catch(err => console.log('Error doing work', err));
}


function getPredictions(preds) {
  return getBusInfo('getpredictions', { stpid: preds.join() })
  .catch(err => {
    console.log('error getting predictions');
    console.log(err);
    throw err;
  });
}

function getVehicles(vIds) {
  return getBusInfo('getvehicles', { vid: vIds.join() })
  .catch(err => {
    console.log('error getting vehicles');
    console.log(err);
    throw err;
  });
}

function cacheInfo(predictions, vehicles, errors) {
  const store = {};
  predictions.forEach(pred => {
    const id = pred.vid + ''; // coerce to string, just to be safe
    store[id] = pred;

    // will have to convert this to central when in prod
    store[id].ts = moment(pred.prdtm, 'YYYYMMDD HH:mm').toISOString();
  });

  vehicles.forEach(veh => {
    const id = veh.vid + '';
    if (!store[id]) {
      console.error(`Vehicle ${id} does not exist in store`);
      return;
    }
    Object.assign(store[id], veh);
  });
  console.log('errors');
  console.log(errors);
  return store;
}
