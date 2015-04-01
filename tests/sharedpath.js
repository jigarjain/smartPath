var cfg       = require('../config'),
        _     = require('lodash');

var Algo = require('../algo');

describe('shortestpath', function () {
    function test() {
        var path1 = [
            {
                addr: 'Koramangala',
                city: 'Bangalore'
            },
            {
                addr: 'Indiranagar',
                city: 'Bangalore'
            }
        ];
        var path2 = [
            {
                addr: 'Domlur',
                city: 'Bangalore'
            },
            {
                addr: 'M G Road',
                city: 'Bangalore'
            }
        ];

        var a = new Algo(path1, path2);
        return a.findShortest()
            .then(function (results) {
                var u1min = new Date(1406282400000);
                var u1max = new Date(1406286000000);
                var u2min = new Date(1406282400000);
                var u2max = new Date(1406284800000);

                var promises = _.collect(results, function (path) {
                    return a.checkTime(path, u1min, u1max, u2min, u2max);
                });

                return Promise.all(promises);
            });
    }

    it('should work', cfg.google.maps.key ? test : undefined);
});
