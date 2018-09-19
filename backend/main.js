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

/*eslint-disable unknown-require */
const trackerConfig = require('./tracker_configuration.json');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: trackerConfig.databaseURL
});

// Database references
const truckLocationsRef = admin.database().ref('truck-locations');
const timeRef = admin.database().ref('current-time');
const stopsRef = admin.database().ref('stops');

// Library classes
const {GTFS} = require('./gtfs.js');
const {HeartBeat} = require('./heart_beat.js');

const gtfs = new GTFS();
new HeartBeat(timeRef, trackerConfig.simulation);
if (trackerConfig.simulation) {
  const {TruckSimulator} = require('./truck_simulator.js');
  const generatedPaths = require('./paths.json');
  generateStopsWithOrderNumbers(gtfs).then((stops) => {
    stopsRef.set(stops);
  });
  new TruckSimulator(timeRef, gtfs, truckLocationsRef, generatedPaths);
} else {
  // Exercise for the reader: integrate real bus location data
}

async function generateStopsWithOrderNumbers (gtfs) {
  const [ stops, stopTimes, trips ] = await Promise.all([gtfs.getTruckStops(), gtfs.getTruckStopTimes(), gtfs.getTruckTrips()]);
  // trips have the PO numbers
  //stop times have trips and stops
  stopTimes.forEach((stopTime) => {
    const tripId = stopTime.trip_id;
    const stopId = stopTime.stop_id;
    const trip = trips.find(trip => {
      return trip.trip_id === tripId;
    });
    console.log('trip', trip);
    const stop = stops.find(stop => {
      return stop.stop_id === stopId;
    });
    if (!stop.poNumbers) stop.poNumbers = [];
    stop.poNumbers.push(trip.po_number)
  });
  console.log('stops', stops);
  return stops;
}
