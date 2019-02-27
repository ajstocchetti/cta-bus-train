const querystring = require('querystring');
const request = require('request');
const moment = require('moment');
const cache = require('./bus-cache');

const baseUrl = 'http://www.ctabustracker.com/bustime/api/v2';
const busKey = process.env.BUSKEY;


function promiseProps(obj) {
  return Object.entries().map(([key, val]))
  return Object.entries(([]))
}

module.exports = {
  getRoutes,
  getStopsByRoute,
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

async function getRoutes() {
  // const cached = cache.getAllRoutes();
  // if (cached.length) return cached;
  const routesResp = await getBusInfo('getroutes');
  const allRoutes = routesResp.routes;
  cache.cacheAllRoutes(allRoutes);
  return allRoutes;
  // TODO: log errors
}

async function getStops(rt, dir) {
  const stopInfo = await getBusInfo('getstops', {rt, dir});
  return stopInfo.stops;
  // TODO: log errors
}

async function getStopsByRoute(routeId, dir) {
  const dirs = await getBusInfo('getdirections', {rt: routeId});
  const scopedDir = async (dir) => {
    const stops = await getStops(routeId, dir);
    return {dir, stops};
  };

  const x = await Promise.all(dirs.directions.map(dir => scopedDir(dir.dir)));
  return x.reduce((o, d) => {
    o[d.dir] = d.stops;
    return o;
  }, {});
}

async function getBusInfo(type, params) {
  const url = `${baseUrl}/${type}?${paramsToQueryStr(params)}`;
  const response = await rp(url);
  return JSON.parse(response)['bustime-response'];
}

async function getPredictions(stopIds) {
  if (!stopIds || !stopIds.length) return [];

  const predictions = await getBusInfo('getpredictions', { stpid: stopIds.join() });
  if (predictions.error) {
    console.log(`Error getting bus predictions for ${stopIds}`);
    console.log(predictions.error);
  }
  return predictions.prd || [];
}

async function getVehicles(vehicleIds) {
  if (!vehicleIds || !vehicleIds.length) return [];

  const vehicles = await getBusInfo('getvehicles', {vid: vehicleIds.join()});
  if (vehicles.error) {
    console.log(`Error getting bus vehicles for ${vehicleIds}`);
    console.log(vehicles.error);
  }
  return vehicles.vehicle || [];
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

  // Step 1: lookup predictions of when busses will arrive at the stop
  const predictions = await getPredictions(stopIds);
  const mapper = {};
  const vIds = predictions.map(p => {
    // loop through predictions once
    // setting the inverse lookup object (vid -> prediction)
    // initializing the array on the return object
    // and finally mapping out the vehicle id
    vehiclesByStop[p.stpid] = []; // initialize empty array on the return object
    p.ts = moment(p.prdtm, 'YYYYMMDD HH:mm').toISOString(); // will have to convert this to central at some point
    mapper[p.vid] = p;
    return p.vid;
  });

  // Step 2: lookup the vehicle for each prediction
  const vehicles = await getVehicles(vIds);
  // map vehicles back to thier stop id
  vehicles.forEach(v => {
    const prediction = mapper[v.vid];
    if (!prediction) return console.log(`no prediction in mapper for ${v.vid}`);
    vehiclesByStop[prediction.stpid].push({veh: v, pred: prediction});
  });
  cache.cacheVehiclesForStops(vehiclesByStop);
  return vehiclesByStop;
}
