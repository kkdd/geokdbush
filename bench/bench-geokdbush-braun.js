'use strict';

var cities = require('all-the-cities');
var kdbush = require('kdbush');
var geokdbush-braun = require('../geokdbush-braun');

var DEGREE = Math.PI / 180;
var DEGREE2HALFCIRCLE = 1/180;

function braunY(lat) {
    return Math.tan(lat/2);
}

console.log('=== geokdbush-braun benchmark ===');

var n = cities.length;
var k = 1000;

var randomPoints = [];
for (var i = 0; i < k; i++) randomPoints.push({
    lon: -180 + 360 * Math.random(),
    lat: -60 + 140 * Math.random()
});

console.time(`index ${n} points`);
var index = new KDBush(cities, (p) => p.lon*DEGREE2HALFCIRCLE, (p) => braunY(p.lat*DEGREE));
console.timeEnd(`index ${n} points`);

console.time('query 1000 closest');
geokdbush-braun.around(index, -119.7051, 34.4363, 1000);
console.timeEnd('query 1000 closest');

console.time('query 50000 closest');
geokdbush-braun.around(index, -119.7051, 34.4363, 50000);
console.timeEnd('query 50000 closest');

console.time(`query all ${n}`);
geokdbush-braun.around(index, -119.7051, 34.4363);
console.timeEnd(`query all ${n}`);

console.time(`${k} random queries of 1 closest`);
for (i = 0; i < k; i++) geokdbush-braun.around(index, randomPoints[i].lon, randomPoints[i].lat, 1);
console.timeEnd(`${k} random queries of 1 closest`);
