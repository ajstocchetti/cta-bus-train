const querystring = require('querystring');
const request = require('request');
const moment = require('moment');
const cache = require('./bus-cache');

const baseUrl = 'http://www.ctabustracker.com/bustime/api/v2';
const busKey = process.env.BUSKEY;

module.exports = {
  getVehiclesForStops,
  paramsToQueryStr,
  getBusInfo,
  getVBySFromCTA,
};

async function rp(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) reject(error);
      else if (response.statusCode > 399) reject(response);
      else resolve(body);
    });
  });
}

function paramsToQueryStr(obj = {}) {
  return querystring.stringify({
    key: busKey,
    format: 'json',
    ...obj,
  });
}

async function getBusInfo(type, params) {
    const url = `${baseUrl}/${type}?${paramsToQueryStr(params)}`;
    const response = await rp(url);
    return JSON.parse(response)['bustime-response'];
}


async function getVehiclesForStops(stopIds) {
  const response = {};

  const toFetch = stopIds.filter(id => {
    // check cache
    const veh = cache.getVehiclesFromCache(id);
    if (veh) response[id] = veh;
    return !veh;
  });

  if (!toFetch.length) return response; // all cached

  const fresh = await getVBySFromCTA(toFetch);
  return {...response, ...fresh};
}

async function getVBySFromCTA(stopIds) {
  const vehiclesByStop = {}; // initiate here
  if (!stopIds || !stopIds.length) return vehiclesByStop;

  const predictions = await getBusInfo('getpredictions', { stpid: stopIds.join() });
  if (predictions.error) {
    console.log(`Error getting bus predictions for ${stopIds}`);
    console.log(predictions.error);
  }

  const mapper = {};
  const vIds = predictions.prd.map(p => {
    // loop through predictions once
    // setting the inverse lookup object
    // initializing the array on the return object
    // and finally mapping out the vehicle id
    vehiclesByStop[p.stpid] = []; // initialize empty array on the return object
    mapper[p.vid] = p.stpid;
    return p.vid;
  });

  const vehicles = await getBusInfo('getvehicles', {vid: vIds.join()});
  if (vehicles.error) {
    console.log(`Error getting bus vehicles for ${vIds}`);
    console.log(vehicles.error);
  }

  // map vehicles back to thier stop id
  vehicles.vehicle.forEach(v => {
    const stopId = mapper[v.vid];
    if (!stopId) console.log(`no stop id in mapper for ${v.vid}`);
    vehiclesByStop[stopId].push(v);
  });

  cache.cacheVehiclesForStops(vehiclesByStop);
  return vehiclesByStop;
}
