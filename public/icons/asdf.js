var request = require('request');
const fs = require('fs');

var x = 0;
while (x < 360) {
  var ctaAngle = 90 - x;
  if (ctaAngle < 0) ctaAngle += 360;
  request
  .get(`http://bustime.mta.info/img/vehicle/vehicle-${x}.png`)
  .on('error', function(err) {
    console.log(err)
  })
  .pipe(fs.createWriteStream(`bus-${ctaAngle}.png`))

	x += 5;
}
