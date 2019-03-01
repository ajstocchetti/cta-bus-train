window.onload = function() {
  // setup click handler for control pannel
  window.cta_controller = {};
  window.cta_config = window.cta_config || {};
  if (!Array.isArray(window.cta_config.busses)) window.cta_config.busses = [];

  // initialize click handlers
  $('#ctrl-resize').click(function() {
    $("#ctrl-items").toggleClass('hide');
  });
  $('#refreshcheck').click(function() {
    window.cta_controller.autorefresh = $('#refreshcheck').is(':checked');
    if (window.cta_controller.autorefresh) {
      updateBusses();
      window.cta_controller.autorefreshInterval = setInterval(updateBusses, 15000);
    } else {
      clearInterval(window.cta_controller.autorefreshInterval);
      window.cta_controller.autorefreshInterval = null;
    }
  });
  $('#pancheck').click(function() {
    window.cta_controller.autopan = $('#pancheck').is(':checked');
  });
  $('#routeInpt').on('change', function() {
    console.log('in the change handler');
    console.log($('#routeInpt').value);
  });

  initMap(window.cta_config.home);
  // trigger initial clicks
  $('#refreshcheck').click();
  $('#pancheck').click();
  loadRoutes();
}

function initMap(homeCoords) {
  var center = homeCoords || [41.8781, -87.6298]; // Chicago
  map = L.map('map', {
    center: center,
    zoom: 16
  });
  window.cta_config.map = map;

  var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
  });
  Esri_WorldStreetMap.addTo(map);

  if (homeCoords) {
    window.cta_config.home_marker = L.marker(homeCoords, {
      // title: 'home',
      riseOnHover: true,
      icon: L.icon({
        iconUrl: './home-icon.png',
        iconSize: [30, 37],
        iconAnchor: [15, 30],
      })
    })
    // .on('mouseover', function(e) {
    //   L.popup().setLatLng(e.latlng).setContent('Home').openOn(map)
    // })
    .addTo(map);
  }
}




  // https://leaflet-extras.github.io/leaflet-providers/preview/
  // var Hydda_Full = L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
  // 	maxZoom: 18,
  // 	attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  // });
  // var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
  // 	maxZoom: 18,
  // 	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  // });
  // var OpenStreetMap_DE = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
  // 	maxZoom: 18,
  // 	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  // });
  // var Stamen_Terrain = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.{ext}', {
  // 	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  // 	subdomains: 'abcd',
  // 	minZoom: 0,
  // 	maxZoom: 18,
  // 	ext: 'png'
  // });
  // var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  // 	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
  // });
  // var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  // 	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  // });
  // var Esri_WorldGrayCanvas = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  // 	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  // 	maxZoom: 16
  // });


function updateBusses() {
  console.log('updating busses');
  var map = window.cta_config.map;
  var busses = window.cta_config.busses;
  var busStops = window.cta_config.busStops || [];
  $.ajax({
    url: `/api/bus/vehicles?stops=${busStops}`,
    context: document.body
  })
  .done(function(resp) {
    busses.forEach(function(marker) {
      map.removeLayer(marker);
    });
    busses.length = 0;
    Object.keys(resp).forEach(stopId => {
      resp[stopId].forEach(veh => addToBusses(veh));
    });

    // adjust zoom
    var fg = [...busses];
    if (window.cta_config.home_marker) fg.push(window.cta_config.home_marker);
    if (window.cta_controller.autopan) map.fitBounds(L.featureGroup(fg).getBounds());
  })
  .error(function(req, status, err) {
    console.log('error in ajax');
    console.log(status);
    console.log(err);
  });
}

function addToBusses(vpData) {
  var vehicle = vpData.veh;
  var pred = vpData.pred;
  var map = window.cta_config.map;
  var angle = (Math.round(vehicle.hdg / 5) * 5) % 360; // wrap 360 back to 0
  var marker = L.marker([ vehicle.lat, vehicle.lon], {
    icon: L.icon({
      iconUrl: `/icons/bus-${angle}.png`
    })
  });
  var text = `Route ${vehicle.rt} [${pred.rtdir}] to ${pred.stpnm}
  <br>
  ${vehicle.dly ? 'Vehicle is delayed.<br>' : ''}
  Arrives at ${moment(pred.ts).format('LT')}
  <br>
  Heading: ${vehicle.hdg}`;

  marker.on('mouseover', function(e) {
    //open popup;
    var popup = L.popup()
     .setLatLng(e.latlng)
     .setContent(text)
     .openOn(map);
  });

  window.cta_config.busses.push(marker);
  marker.addTo(map);
}

function loadRoutes() {
  $.ajax({
    url: '/api/bus/routes',
    context: document.body
  })
  .done(function(routes) {
    window.cta_config.all_routes = routes;
  })
  .error(function(req, status, err) {
    console.log('Error loading routes', status, err);
  });
}
