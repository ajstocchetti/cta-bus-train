const fs = require('fs');
const moment = require('moment');
const request = require('request');

module.exports = {
  myStopInfo,
};

const baseUrl = 'http://lapi.transitchicago.com/api/1.0/';
const trainKey = process.env.TRAINKEY;
const myStops = process.env.TRAIN_STOPS.split(',');
const stopSataionData = {};

// setup station data
fs.readFile('./gtfs/stops.txt', 'utf8', (err, data) => {
  if (err) {
      console.error('Error reading stops.txt', err);
      return;
  }

  data.split('\n').forEach(line => {
    const arr = line.trim().split(',');
    if (myStops.indexOf(arr[0]) < 0) return;

    stopSataionData[arr[0]] = {
      stop_id: arr[0],
      stop_code: arr[1],
      stop_name: arr[2],
      stop_desc: arr[3],
      stop_lat: arr[4],
      stop_lon: arr[5],
      location_type: arr[6],
      parent_station: arr[7],
      wheelchair_boarding: arr[8],
    };
  });
});

function simplifyParams(obj) {
  let base = {
    key: trainKey,
    outputType: 'JSON',
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

function getTrainInfo(type, params) {
    const url = `${baseUrl}${type}${simplifyParams(params)}`;
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        if (error) reject(error);
        else if (response.statusCode > 399) reject(response);
        else resolve(JSON.parse(body).ctatt);
      });
    });
}


function getPredictions(preds) {
  return getTrainInfo('ttarrivals.aspx', { mapid: preds.join() })
  .catch(err => {
    console.log('error getting predictions');
    console.log(err);
    throw err;
  });
}

function parsePredictions(resp) {
  const map = {};
  resp.eta.forEach(train => {
    map[train.staId] = map[train.staId] || defaultStation(train.staId);
    map[train.staId][train.stpId] = map[train.staId][train.stpId] || [];
    map[train.staId][train.stpId].push(train);
  });
  return map;
}

function defaultStation(stationId) {
  return station = {
    meta: stopSataionData[stationId + ''],
  };
}

function myStopInfo() {
  return getPredictions(myStops).then(parsePredictions);
}
