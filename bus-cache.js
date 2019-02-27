const cache = {}; // in memory object
const routes = [];
/*
  cache = {
    stop_id_1: {
      exp: 1234567890, // timestamp in milliseconds
      vehicles: [{vehicle1}, {vehicle2}, {vehicle3}],
    },
    stop_id_2: {
      exp: 9876543210,
      vehicles: [{vehicle4}],
    },
    stop_id_3: {
      exp: 1357908642,
      vehicles: [{vehicle5}, {vehicle6}],
    },
  };
*/


module.exports = {
  cacheVehiclesForStop,
  cacheVehiclesForStops,
  getCacheExpiration,
  getVehiclesFromCache,
  cacheAllRoutes,
  getAllRoutes,
}

/* Vehicle Info */

function getCacheExpiration() {
  return Date.now() + 30000; // expire in 30 seconds
}

function cacheVehiclesForStops(ctaResponse) {
  const exp = getCacheExpiration();
  Object.entries(ctaResponse).forEach(([stopId, vehs]) => cacheVehiclesForStop(stopId, vehs, exp));
}

function cacheVehiclesForStop(stopId, vehicles, exp = cacheVehiclesForStop()) {
  cache[stopId] = {exp, vehicles};
}
function getVehiclesFromCache(stopId) {
  if (cache[stopId] && cache[stopId].exp > Date.now()) {
    return cache[stopId].vehicles;
  }
  return null;
}

/* Bus Routes */
function cacheAllRoutes(theRoutes) {
  clearAllRoutes();
  theRoutes.forEach(r => routes.push(r));
}

function clearAllRoutes() {
  routes.length = 0;
}

function getAllRoutes() {
  return routes;
}
