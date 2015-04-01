
var _              = require('lodash'),
    locations      = require('./locations'),
    DistanceMatrix = locations.DistanceMatrix,
    TimeMatrix     = locations.TimeMatrix;

    /**
     * @constructor
     * @class Algo
     * @param {Array} path1 Array of locations
     * @param {Array} path2 Array of locations
     */
    function Algo(path1, path2) {
        this.data = {
            'ids'      : [],
            'locs'     : {},
            'locsarr'  : [],
            'distances': {},
            'durations': {},
            'u1'       : [],
            'u2'       : []
        };

        var d = this.data;

        var allPaths = path1.concat(path2);

        this.dpromise = DistanceMatrix.find(allPaths, allPaths)
            .then(function (dmatrix) {
                _.each(d.ids, function (id1, i) {
                    d.distances[id1] = {};

                    _.each(d.ids, function (id2, j) {
                        d.distances[id1][id2] = dmatrix[i][j];
                    });
                });
            });

        this.tpromise = TimeMatrix.find(allPaths, allPaths)
            .then(function (tmatrix) {
                _.each(d.ids, function (id1, i) {
                    d.durations[id1] = {};

                    _.each(d.ids, function (id2, j) {
                        d.durations[id1][id2] = tmatrix[i][j];
                    });
                });
            });

        _.each(path1, function (loc, i) {
            var id = 'a' + i;
            d.locs[id] = loc;
            d.u1.push(id);
        });

        _.each(path2, function (loc, i) {
            var id = 'b' + i;
            d.locs[id] = loc;
            d.u2.push(id);
        });

        _.each(d.locs, function (loc, id) {
            d.ids.push(id);
            d.locsarr.push(loc);
        });
    }

    Algo.prototype = {
        /**
         * Find shortest paths
         *
         * @method findShortest
         * @for sharedpath.Algo
         * @return {Promise} An array of paths, where each path is represented as:
         *
         *     [
         *         {
         *             group: 'a' // can be 'a' or 'b'
         *             index: 1   // same as index of path1 or path2 (depending on group)
         *             loc  : {} // original passed location
         *         },
         *         // ...
         *     ]
         */
        'findShortest': function () {
            var data = this.data;

            return Promise.all([this.dpromise, this.tpromise]).then(function () {
                var result = {
                    'combs'   : [],
                    'ordered' : [],
                    'shortest': []
                };

                // Find all path combinations
                result.combs = getArrayCombinations(data.ids, [], []);

                // Filter path combinations so only ordered ones remain
                result.ordered = _.filter(result.combs, isPathOrdered);

                // Find shortest paths
                result.shortest = getShortest(result.ordered, data);

                return _.collect(result.shortest, function (path) {
                    // convert to user wanted format
                    return _.collect(path, function (loc) {
                        return {
                            'group': loc.substr(0, 1),
                            'index': loc.substr(1),
                            'loc'  : data.locs[loc]
                        };
                    });
                });
            });
        },

        /**
         * Check if a path repects time boundaries
         *
         * @method checkTime
         * @for sharedpath.Algo
         * @param  {Array} path  A path of type returned by `findShortest()`
         * @param  {Date} u1min User 1 minimum departure time
         * @param  {Date} u1max User 1 maximum arrival time
         * @param  {Date} u2min User 2 minimum departure time
         * @param  {Date} u2max User 2 maximum arrival time
         * @return {Promise}
         *
         *      {
         *          "starttime": {
         *              "u1": // Date,
         *              "u2": // Date
         *          },
         *          "endtime": {
         *              "u1": // Date,
         *              "u2": // Date
         *          },
         *          "duration": {
         *              "u1": // in s,
         *              "u2": // in s
         *          },
         *          "distance" : {
         *              "u1": // in kms,
         *              "u2": // in kms
         *          }
         *          "slice": {
         *              "u1" : ['l1', 'l2', 'l3'], // collection of location objects
         *              "u" : ['b0', 'a1', 'b1']
         *          },
         *          "locs" : {
         *              "u1" : [l1, l2],
         *              "u2" : [l2, l3]
         *          }
         *          "valid": false
         *      };
         */
        'checkTime': function (path, u1min, u1max, u2min, u2max) {
            var data = this.data;

            return Promise.all([this.dpromise, this.tpromise]).then(function () {
                if (typeof path[0] !== 'string') {
                    path = _.collect(path, function (l) {
                        return l.group + l.index;
                    });
                }

                u1min = u1min.getTime() / 1000;
                u2min = u2min.getTime() / 1000;
                u1max = u1max.getTime() / 1000;
                u2max = u2max.getTime() / 1000;

                var result = {
                    'totalTime': 0,
                    'totalDistance': 0,
                    'starttime': {},
                    'endtime': {},
                    'duration': {},
                    'distance': {},
                    'slice': {},
                    'valid': false
                };

                // Find out user path slices and durations
                result.slice.u1 = getUserPathSlice(path, data.u1);
                result.slice.u2 = getUserPathSlice(path, data.u2);

                result.duration.u1 = getPathDuration(result.slice.u1, data.durations);
                result.duration.u2 = getPathDuration(result.slice.u2, data.durations);

                // Calculate total time for journey
                result.totalTime = getPathDuration(path, data.durations);

                result.distance.u1 = getPathDistance(result.slice.u1, data.distances);
                result.distance.u2 = getPathDistance(result.slice.u2, data.distances);

                // Calculate total distance for journey
                result.totalDistance = getPathDistance(path, data.distances);

                // Find out start times
                var prepath = [];
                if (_.first(path) === _.first(data.u1)) {
                    result.starttime.u1 = u1min;

                    prepath = path.slice(0, path.indexOf(_.first(data.u2)) + 1);
                    result.starttime.u2 = result.starttime.u1 + getPathDuration(prepath, data.durations);
                } else {
                    result.starttime.u2 = u2min;

                    prepath = path.slice(0, path.indexOf(_.first(data.u1)) + 1);
                    result.starttime.u1 = result.starttime.u2 + getPathDuration(prepath, data.durations);
                }

                // Find out end times
                result.endtime.u1 = result.starttime.u1 + result.duration.u1;
                result.endtime.u2 = result.starttime.u2 + result.duration.u2;

                // Check times
                result.valid = result.starttime.u1 >= u1min &&
                    result.starttime.u2 >= u2min &&
                    result.endtime.u1 <= u1max &&
                    result.endtime.u2 <= u2max;

                result.slice.u1 = _.collect(result.slice.u1, function (l) {
                    return data.locs[l];
                });

                result.slice.u2 = _.collect(result.slice.u2, function (l) {
                    return data.locs[l];
                });

                //console.log(result);
                result.starttime.u1 = new Date(result.starttime.u1 * 1000);
                result.endtime.u1   = new Date(result.endtime.u1 * 1000);
                result.starttime.u2 = new Date(result.starttime.u2 * 1000);
                result.endtime.u2   = new Date(result.endtime.u2 * 1000);
                return result;
            });
        }
    };

    function getArrayCombinations(locs, permArr, usedChars) {
        _.each(locs, function (loc, i) {
            var ch = locs.splice(i, 1)[0];
            usedChars.push(ch);

            if (!locs.length) {
                permArr.push(usedChars.slice());
            }

            permArr = getArrayCombinations(locs, permArr, usedChars);
            locs.splice(i, 0, ch);
            usedChars.pop();
        });

        return permArr;
    }

    function isPathOrdered(path) {
        var prevs = [];
        var valid = true;

        _.each(path, function (id) {
            var cat = id.substr(0, 1);
            var num = Number(id.substr(1));

            var found = true, i = 0;
            for (i = 0; i < num; i++) {
                if (prevs.indexOf(cat + i) === -1) {
                    found = false;
                    break;
                }
            }

            if (!found) {
                valid = false;
                return false;
            }

            prevs.push(id);
        });

        return valid;
    }

    function getShortest(paths, data) {
        var minDistance = 0, minDuration = 0, minPaths = [], firstCheck = true;

        _.each(paths, function (path) {
            var dis = getPathDistance(path, data.distances);
            var dur = getPathDuration(path, data.durations);

            if (firstCheck || dis < minDistance) {
                minDistance = dis;
                minDuration = dur;
                minPaths = [path];
                firstCheck = false;
            } else if (dis === minDistance) {
                if (dur < minDuration) {
                    minDuration = dur;
                    minPaths = [path];
                } else if (dur === minDuration) {
                    minPaths.push(path);
                }
            }
        });

        return minPaths;
    }

    function getPathDistance(path, distances) {

        var distance = 0, prev = path[0];

        _.each(path, function (id) {
            distance = distance + distances[prev][id];
            prev = id;
        });

        return distance;
    }

    function getPathDuration(path, durations) {
        var duration = 0, prev = path[0];

        _.each(path, function (id) {
            duration = duration + durations[prev][id];
            prev = id;
        });

        return duration;
    }

    function getUserPathSlice(path, usrpathids) {
        var slice = [], recording = false, valid = false;

        _.each(path, function (locid) {
            if (recording) {
                slice.push(locid);

                if (_.last(usrpathids) === locid) {
                    valid = true;
                    recording = false;
                }
            } else if (_.first(usrpathids) === locid) {
                slice.push(locid);
                recording = true;
            }
        });

        if (! valid) {
            slice = [];
        }

        return slice;
    }

module.exports = Algo;
