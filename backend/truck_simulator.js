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

/* eslint-disable no-undef-expression */
const moment = require('moment');
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');

const DATE_FORMAT = 'YYYYMMDD HH:mm:ss';

// TruckSimulator updates the simulated location of the trucks
// every time `timeRef` changes. This uses a combination of the
// generated paths along with route information pulled from `gtfs`.
// The updated simulated truck locations is published to `truckLocationsRef`.
exports.TruckSimulator = class {
  constructor(timeRef, gtfs, truckLocationsRef, generatedPaths) {
    this.timeRef = timeRef;
    this.gtfs = gtfs;
    this.truckLocationsRef = truckLocationsRef;
    this.paths = generatedPaths;

    this.timeRef.on(
      'value',
      snapshot => {
        _async(() => {
          const now = moment.utc(snapshot.val().moment);
          this.truckAdvance(now);
        })().catch(err => {
          console.error(err);
        });
      },
      errorObject => {
        console.error('The read failed: ' + errorObject.code);
      }
    );
  }

  truckAdvance(now) {
    const trucks = this.getTruckPositionsAt(now);
    const truckLocations = {};
    if(trucks.length > 0) {
      trucks.forEach(truck => {
        console.log('trip', truck.trip);
        const route = _await(this.gtfs.getTruckRouteById(truck.trip.route_id));
        truckLocations[`Trip_${truck.trip.trip_id}`] = {
          route_id: truck.trip.route_id,
          route_name: route.route_name,
          route_color: route.route_color,
          po_number: truck.trip.po_number,
          lat: truck.location.lat,
          lng: truck.location.lng,
        };
      });
      this.truckLocationsRef.set(truckLocations);
    }
  }

  getTruckPositionsAt(time) {
    function interpolate(before, after, proportion) {
      return {
        lat: before.lat * proportion + after.lat * (1 - proportion),
        lng: before.lng * proportion + after.lng * (1 - proportion),
      };
    }

    function search(truck, before, after) {
      if (after - before > 1) {
        const midpoint = Math.round(before + (after - before) / 2);
        const midpointTime = moment.utc(truck.points[midpoint].time, DATE_FORMAT);
        if (midpointTime.isBefore(time)) {
          return search(truck, midpoint, after);
        }
        return search(truck, before, midpoint);
      }
      const beforeTime = moment.utc(truck.points[before].time, DATE_FORMAT);
      const afterTime = moment.utc(truck.points[after].time, DATE_FORMAT);
      const proportion = time.diff(beforeTime) / afterTime.diff(beforeTime);
      return interpolate(
        truck.points[before].location,
        truck.points[after].location,
        proportion
      );
    }

    const truckPositions = [];
    this.getTrucksActiveAt(time).forEach(truck => {
      truckPositions.push({
        trip: truck.trip,
        location: search(truck, 0, truck.points.length - 1)
      });
    });
    return truckPositions;
  }

  getTrucksActiveAt(time) {
    const trucks = [];
    this.paths.forEach(truck => {
      const start = moment.utc(truck.points[0].time, DATE_FORMAT);
      const end = moment.utc(
        truck.points[truck.points.length - 1].time,
        DATE_FORMAT
      );
      if (start.isBefore(time) && end.isAfter(time)) {
        trucks.push(truck);
      }
    });
    return trucks;
  }
};
