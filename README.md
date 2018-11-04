## geokdbush [![Build Status](https://travis-ci.org/mourner/geokdbush.svg?branch=master)](https://travis-ci.org/mourner/geokdbush)

A geographic extension for [kdbush](https://github.com/mourner/kdbush),
the fastest static spatial index for points in JavaScript.

It implements fast [nearest neighbors](https://en.wikipedia.org/wiki/Nearest_neighbor_search) queries
for locations on Earth, taking Earth curvature and date line wrapping into account.
Inspired by [sphere-knn](https://github.com/darkskyapp/sphere-knn), but uses a different algorithm.

### Example

```js
var kdbush = require('kdbush');
var geokdbush = require('geokdbush');

var index = kdbush(points, (p) => p.lon, (p) => p.lat);

var nearest = geokdbush.around(index, -119.7051, 34.4363, 1000);
```

### API

#### geokdbush.around(index, longitude, latitude[, maxResults, maxDistance, filterFn])

Returns an array of the closest points from a given location in order of increasing distance.

- `index`: [kdbush](https://github.com/mourner/kdbush) index.
- `longitude`: query point longitude.
- `latitude`: query point latitude.
- `maxResults`: (optional) maximum number of points to return (`Infinity` by default).
- `maxDistance`: (optional) maximum distance in kilometers to search within (`Infinity` by default).
- `filterFn`: (optional) a function to filter the results with.

#### geokdbush.distance(longitude1, latitude1, longitude2, latitude2)

Returns great circle distance between two locations in kilometers.

### Performance

This library is incredibly fast.
The results below were obtained with `npm run bench`
(Node v7.7.2, Macbook Pro 15 mid-2012).

benchmark | geokdbush | sphere-knn | naive
--- | ---: | ---: | ---:
index 138398 points | 69ms | 967ms | n/a
query 1000 closest | 4ms | 4ms | 155ms
query 50000 closest | 31ms | 368ms | 155ms
query all 138398 | 80ms | 29.7s | 155ms
1000 queries of 1 | 55ms | 165ms | 18.4s


### Performance 2

```js
var kdbush = require('kdbush');
var geokdbush-braun = require('geokdbush-braun');
var DEGREE = Math.PI / 180;
var DEGREE2HALFCIRCLE = 1/180;
function braunY(lat) {
	return Math.tan(lat/2);
}

var index = new KDBush(points, (p) => p.lon*DEGREE2HALFCIRCLE, (p) => braunY(p.lat*DEGREE));
var nearest = geokdbush-braun.around(index, -119.7051, 34.4363, 1000);
```

(Macbook Pro 15 Core i7 4850HQ)

```
=== geokdbush-braun benchmark ===
index 138398 points: 82.429ms
query 1000 closest: 4.702ms
query 50000 closest: 38.234ms
query all 138398: 82.912ms
1000 random queries of 1 closest: 45.886ms

=== geokdbush benchmark ===
index 138398 points: 80.405ms
query 1000 closest: 4.693ms
query 50000 closest: 42.159ms
query all 138398: 86.634ms
1000 random queries of 1 closest: 57.478ms

=== vptree.js benchmark ===
index 138398 points: 568.375ms
query 1000 closest: 2.840ms
query 50000 closest: 341.508ms
query all 138398: 3092.165ms
1000 random queries of 1 closest: 15.587ms

=== sphere-knn benchmark ===
index 138398 points: 1173.998ms
query 1000 closest: 3.759ms
query 50000 closest: 287.823ms
query all 138398: 93790.312ms
1000 random queries of 1 closest: 86.234ms

=== naive benchmark ===
query (sort) all 138398: 164.420ms
1000 random queries of 1 closest: 20142.060ms
```
