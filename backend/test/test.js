/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const assert = require('assert');
const Promise = require('bluebird');
const {GTFS} = require('../gtfs');
const gtfs = new GTFS();
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');
const trackerConfig = require('../tracker_configuration.json');
const googleMapsClient = require('@google/maps').createClient({
  key: trackerConfig.mapsApiKey,
  Promise
});

// Google Maps Client usage testing
const stop = {
  stop_lat: 37.394109,
  stop_lon: -122.076628,
  stop_name: 'Mountain View Caltrain Station',
  stop_id: 21,
  location_type: 0
};

describe('GoogleMapsClient', () => {
  describe('#reverseGeocode', () => {
    it(
      'should return a formatted address for MTV CalTrain lat/lng',
      _async(() => {
        const response = _await(
          googleMapsClient
            .reverseGeocode({latlng: {lat: stop.stop_lat, lng: stop.stop_lon}})
            .asPromise()
        );
        console.log(response);
        assert.equal(
          '600 W Evelyn Ave, Mountain View, CA 94041, USA',
          response.json.results[0].formatted_address
        );
      })
    );
  });
});

// GTFS tests
describe('GTFS', () => {
  describe('#getCalendarDates', () => {
    it(
      'should return a list of calendar dates',
      _async(() => {
        const calendarDates = _await(gtfs.getCalendarDates());
        assert.strictEqual(3, calendarDates.length);
        assert.strictEqual('4', calendarDates[0].service_id);
        assert.strictEqual(20180730, calendarDates[0].date);
        assert.strictEqual('6', calendarDates[2].service_id);
        assert.strictEqual(20180730, calendarDates[2].date);
      })
    );
  });

  describe('#getTruckRouteById', () => {
    it(
      'should return a specific route',
      _async(() => {
        const route = _await(gtfs.getTruckRouteById(10));
        assert.strictEqual(10, route.route_id);
      })
    );
  });

  describe('#getTruckStopsForTrip', () => {
    it(
      'should return the stops for a trip',
      _async(() => {
        const trip_id = 700;
        const stops = _await(gtfs.getTruckStopInfoForTrip(trip_id));
        assert.strictEqual(2, stops.length);
        const stop = stops[1];
        assert.strictEqual(21, stop.stop_id);
      })
    );
  });
});
