/**
 * @module locations
 */

var cfg   = require('./config'),
    https = require('https'),
    qs    = require('querystring'),
    _     = require('lodash');

/**
 * A location on earth
 *
 * @constructor
 * @class locations.Location
 */
function Location() {
    /**
     * @property lat
     * @type {Number}
     */
    this.lat = null;

    /**
     * @property lng
     * @type {Number}
     */
    this.lng = null;

    /**
     * Street address
     *
     * @property addr
     * @type {String}
     */
    this.addr = null;

    /**
     * Area
     *
     * @property area
     * @type {String}
     */
    this.area = null;

    /**
     * @property city
     * @type {String}
     */
    this.city = null;

    /**
     * @property state
     * @type {String}
     */
    this.state = null;

    /**
     * @property country
     * @type {String}
     */
    this.country = null;

    /**
     * Postcode
     *
     * @property postcode
     * @type {String}
     */
    this.postcode = null;
}

function googleMatrix(origins, destinations) {
    function locToString(loc) {
        if (loc.lat && loc.lng) {
            return loc.lat + ',' + loc.lng;
        }

        return _.create(new Location(), loc).toString();
    }

    var originStrings = _.collect(origins, locToString);
    var destStrings   = _.collect(destinations, locToString);

    var params = qs.stringify({
        'origins'     : originStrings.join('|'),
        'destinations': destStrings.join('|'),
        'sensor'      : false,
        'key'         : cfg.google.maps.key
    });

    var opts = {
        'host': 'maps.googleapis.com',
        'port': 443,
        'path': '/maps/api/distancematrix/json?' + params
    };

    var dmatrix = [];
    var tmatrix = [];

    return new Promise(function (resolve, reject) {
        var req = https.get(opts, function (res) {
            var result = '';

            if (res.statusCode !== 200) {
                return reject(new Error('Invalid status code: ' + res.statusCode));
            }

            res.on('error', reject);

            res.on('data', function (chunk) {
                result = result + chunk;
            });

            res.on('end', function () {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    return reject(e);
                }

                switch (result.status) {
                    case 'OK':
                        _.each(origins, function (origin, rowindex) {
                            dmatrix[rowindex] = [];
                            tmatrix[rowindex] = [];

                            _.each(destinations, function (destination, colindex) {
                                dmatrix[rowindex][colindex] = null;
                                tmatrix[rowindex][colindex] = null;

                                if (result.rows[rowindex].elements[colindex].status === 'OK') {
                                    dmatrix[rowindex][colindex] = result.rows[rowindex].elements[colindex].distance.value;
                                    tmatrix[rowindex][colindex] = result.rows[rowindex].elements[colindex].duration.value;
                                }
                            });
                        });

                        var output = {
                            'distances': dmatrix,
                            'durations': tmatrix
                        };

                        resolve(output);
                        break;

                    case 'ZERO_RESULTS':
                        resolve([]);
                        break;

                    case 'OVER_QUERY_LIMIT':
                        reject(new Error('Unable to geocode - api overusage'));
                        break;

                    default:
                        console.log(result);
                        reject(new Error('Unable to geocode: ' + result.status));
                        break;
                }
            });
        });

        req.on('error', reject);
    });
}

/**
 * @class locations.DistanceMatrix
 */
function DistanceMatrix() {}
/**
 * @static
 * @method find
 * @for locations.DistanceMatrix
 * @param  {Array} origins {{#crossLink "locations.Location"}}Locations{{/crossLink}}
 *                         with coordinates and / or addresses
 * @param  {Array} destinations {{#crossLink "locations.Location"}}Locations{{/crossLink}}
 *                         with coordinates and / or addresses
 * @return {Promise}       M x N array, where:
 * * m = no. of origins
 * * n = no. of destinations
 * * arr[i][j] = distance between origin[i] and destination[j] (in metres), if not found, it will be null
 */
DistanceMatrix.find = function (origins, destinations) {
    return googleMatrix(origins, destinations)
        .then(function (data) {
            return data.distances;
        });
};

/**
 * @class locations.TimeMatrix
 */
function TimeMatrix() {}
/**
 * @static
 * @method find
 * @for locations.TimeMatrix
 * @param  {Array} origins {{#crossLink "locations.Location"}}Locations{{/crossLink}}
 *                         with coordinates and / or addresses
 * @param  {Array} destinations {{#crossLink "locations.Location"}}Locations{{/crossLink}}
 *                         with coordinates and / or addresses
 * @return {Promise}       M x N array, where:
 * * m = no. of origins
 * * n = no. of destinations
 * * arr[i][j] = duration between origin[i] and destination[j] (in seconds), if not found, it will be null
 */
TimeMatrix.find = function (origins, destinations) {
    return googleMatrix(origins, destinations)
        .then(function (data) {
            return data.durations;
        });
};


module.exports = {
    'Location'      : Location,
    'DistanceMatrix': DistanceMatrix,
    'TimeMatrix'    : TimeMatrix,
};
