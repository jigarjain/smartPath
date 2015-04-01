var assert    = require('assert'),
    _         = require('lodash'),
    cfg       = require('../config');
    locations = require('../locations');

var DistanceMatrix = locations.DistanceMatrix,
    TimeMatrix     = locations.TimeMatrix,
    Location       = locations.Location;

describe('DistanceMatrix', function () {
    describe('#find()', function () {
        function test() {
            var origins = [
                {
                    'addr': 'Connaught Place',
                    'city': 'New Delhi'
                },
                {
                    'lat': 12.927923,
                    'lng': 77.627108
                }
            ];
            var destinations = [
                {
                    'lat': 28.592140,
                    'lng': 77.046048
                },
                {
                    'addr': 'Indiranagar',
                    'city': 'Bangalore'
                }
            ];

            return DistanceMatrix.find(origins, destinations)
                .then(function (matrix) {
                    assert(matrix.length, 2);

                    _.each(matrix, function (row) {
                        assert(row.length, 2);
                    });
                });
        }

        it('should find the distances between locations', cfg.google.maps.key ? test : undefined);
    });
});

describe('TimeMatrix', function () {
    describe('#find()', function () {
        function test() {
            var origins = [
                {
                    'addr': 'Connaught Place',
                    'city': 'New Delhi'
                },
                {
                    'lat': 12.927923,
                    'lng': 77.627108
                }
            ];
            var destinations = [
                {
                    'lat': 28.592140,
                    'lng': 77.046048
                },
                {
                    'addr': 'Indiranagar',
                    'city': 'Bangalore'
                }
            ];

            return TimeMatrix.find(origins, destinations)
                .then(function (matrix) {
                    assert(matrix.length, 2);

                    _.each(matrix, function (row) {
                        assert(row.length, 2);
                    });
                });
        }

        it('should find the durations between locations', cfg.google.maps.key ? test : undefined);
    });
});
