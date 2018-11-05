'use strict';

var tinyqueue = require('tinyqueue');

exports.around = around;

var earthRadius = 6371;
var HALFCIRCLE = Math.PI;
var DEGREE = Math.PI / 180;
var DEGREE2HALFCIRCLE = 1/180;

function braunY(lat) {
    return Math.tan(lat/2);
}
// y = braunY(lat), cosLat = (1-y**2)/(1+y**2), sinLat = 2*y/(1+y**2), tanLat = 2*y/(1-y**2)

function around(index, lng, lat, maxResults, maxDistance, predicate) {

    var x = lng*DEGREE2HALFCIRCLE, y = braunY(lat*DEGREE);

    var haverSinDX, maxHaverSinDist = 1, result = [];
    if (maxResults === undefined) maxResults = Infinity;
    if (maxDistance !== undefined) {
        maxHaverSinDist = haverSin(maxDistance/earthRadius);
    }

    // a distance-sorted priority queue that will contain both points and kd-tree nodes
    var q = tinyqueue(null, compareDist);

    // an object that represents the top kd-tree node (the whole Earth)
    var node = {
        left: 0, // left index in the kd-tree array
        right: index.ids.length - 1, // right index
        axis: 0, // 0 for longitude axis and 1 for latitude axis
        dist: 0, // will hold the lower bound of children's distances to the query point
        minX: -1, // bounding box of the node
        minY: -1,
        maxX: 1,
        maxY: 1
    };

    while (node) {
        var item;
        var right = node.right;
        var left = node.left;

        if (right - left <= index.nodeSize) { // leaf node

            // add all points of the leaf node to the queue
            for (var i = left; i <= right; i++) {
                item = index.points[index.ids[i]];
                if (!predicate || predicate(item)) {
                    haverSinDX = haverSinX(x - index.coords[2 * i]);
                    q.push({
                        item: item,
                        dist: haverSinDist(haverSinDX, y, index.coords[2 * i + 1])
                    });
                }
            }

        } else { // not a leaf node (has child nodes)

            var m = (left + right) >> 1; // middle index

            var midX = index.coords[2 * m];
            var midY = index.coords[2 * m + 1];

            // add middle point to the queue
            item = index.points[index.ids[m]];
            if (!predicate || predicate(item)) {
                haverSinDX = haverSinX(x - midX);
                q.push({
                    item: item,
                    dist: haverSinDist(haverSinDX, y, midY)
                });
            }

            var nextAxis = (node.axis + 1) % 2;

            // first half of the node
            var leftNode = {
                left: left,
                right: m - 1,
                axis: nextAxis,
                minX: node.minX,
                minY: node.minY,
                maxX: node.axis === 0 ? midX : node.maxX,
                maxY: node.axis === 1 ? midY : node.maxY,
                dist: 0
            };
            // second half of the node
            var rightNode = {
                left: m + 1,
                right: right,
                axis: nextAxis,
                minX: node.axis === 0 ? midX : node.minX,
                minY: node.axis === 1 ? midY : node.minY,
                maxX: node.maxX,
                maxY: node.maxY,
                dist: 0
            };

            leftNode.dist = boxDist(x, y, leftNode);
            rightNode.dist = boxDist(x, y, rightNode);

            // add child nodes to the queue
            q.push(leftNode);
            q.push(rightNode);
        }

        // fetch closest points from the queue; they're guaranteed to be closer
        // than all remaining points (both individual and those in kd-tree nodes),
        // since each node's distance is a lower bound of distances to its children
        while (q.length && q.peek().item) {
            var candidate = q.pop();
            if (candidate.dist > maxHaverSinDist) return result;
            result.push(candidate.item);
            if (result.length === maxResults) return result;
        }

        // the next closest kd-tree node
        node = q.pop();
    }

    return result;
}

// lower bound for distance from a location to points inside a bounding box
function boxDist(x, y, node) {
    var minX = node.minX;
    var maxX = node.maxX;
    var minY = node.minY;
    var maxY = node.maxY;

    // query point is between minimum and maximum longitudes
    if (x >= minX && x <= maxX) {
        if (y <= minY) return haverSinDist(0, y, minY); // south
        if (y >= maxY) return haverSinDist(0, y, maxY); // north
        return 0; // inside the bbox
    }

    // query point is west or east of the bounding box;
    // calculate distances to lower and higher bbox corners and extremum (if it's within this range);
    // one of the three distances will be the lower bound of great circle distance to bbox
    var haverSinDX = Math.min(haverSinX(x-minX), haverSinX(x-maxX));
    var extremumY = vertexY(y, haverSinDX);
    if (extremumY >= minY && extremumY <= maxY) {
        return haverSinDist(haverSinDX, y, extremumY);
    }
    return Math.min(haverSinDist(haverSinDX, y, minY), haverSinDist(haverSinDX, y, maxY));
}

function compareDist(a, b) {
    return a.dist - b.dist;
}

function square(x) {
    return x * x;
}

function haverSin(theta) {
    return square(Math.sin(theta/2));
}

function haverSinX(x) {
    return haverSin(x*HALFCIRCLE);
}

// Haversine formula
function haverSinDist(haverSinDX, y1, y2) {
    var cosy1 = 1 - y1*y1;
    var cosy2 = 1 - y2*y2;
    var den = 1 / ((1 + y1*y1) * (1 + y2*y2));
    var haverSinDY = square(y1*cosy2 - y2*cosy1) * den;
    return (haverSinDX * cosy1 * cosy2 + haverSinDY) * den;
}

function greatCircleDist(haverSinDist) {
    return 2*earthRadius*Math.asin(Math.sqrt(haverSinDist));
}

// the (highest or lowest) latitude of the cross track point of a great circle and a meridian
function vertexY(y, haverSinDX) {
    var cosXDelta = 1 - 2 * haverSinDX;
    if (cosXDelta <= 0) return y>0?1:-1;
    var tanLat = 2*y/(1-y*y);
    var w = tanLat / cosXDelta;
    return w / (1 + Math.sqrt(1 + w*w)); // = braunY(atan(w))
}
