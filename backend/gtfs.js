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

const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const Promise = require('bluebird');
const sqlite3 = Promise.promisifyAll(require('sqlite3'));

exports.GTFS = class {
  constructor() {
    function tableColumns(properties) {
      return properties
        .map(prop => {
          return `${prop.name} ${prop.type}`;
        })
        .join(',');
    }

    function tablePlaceholders(properties) {
      return properties
        .map(() => {
          return '?';
        })
        .join(',');
    }

    function insertRecord(stmt, record, properties) {
      stmt.run(
        properties.map(prop => {
          return record[prop.name];
        })
      );
    }

    function load(db, filename, properties) {
      const createStmt = `CREATE TABLE ${filename} (
          ${tableColumns(properties)}
      )`;
      db.run(createStmt);
      const csv = fs.readFileSync(`${__dirname}/gtfs/${filename}.txt`);
      const records = parse(csv, {columns: true});
      const insertStmt = `INSERT INTO ${filename}
                          VALUES (${tablePlaceholders(properties)})`;
      const stmt = db.prepare(insertStmt);
      records.forEach(record => {
        insertRecord(stmt, record, properties);
      });
      stmt.finalize();
    }

    function loadCalendarDates(db) {
      load(db, 'calendar_dates', [
        {name: 'service_id', type: 'TEXT'},
        {name: 'date', type: 'INTEGER'},
        {name: 'exception_type', type: 'INTEGER'}
      ]);
    }

    function loadTruckRoutes(db) {
      load(db, 'truck_routes', [
        {name: 'route_type', type: 'INTEGER'},
        {name: 'route_id', type: 'INTEGER'},
        {name: 'route_name', type: 'TEXT'},
        {name: 'route_color', type: 'TEXT'},
      ]);
    }

    function loadTruckStopTimes(db) {
      load(db, 'truck_stop_times', [
        {name: 'trip_id', type: 'INTEGER'},
        {name: 'arrival_time', type: 'TEXT'},
        {name: 'departure_time', type: 'TEXT'},
        {name: 'stop_id', type: 'INTEGER'},
        {name: 'stop_sequence', type: 'INTEGER'},
      ]);
    }

    function loadTruckStops(db) {
      load(db, 'truck_stops', [
        {name: 'stop_lat', type: 'REAL'},
        {name: 'stop_lon', type: 'REAL'},
        {name: 'stop_name', type: 'TEXT'},
        {name: 'stop_id', type: 'INTEGER'},
        {name: 'location_type', type: 'INTEGER'}
      ]);
    }

    function loadTruckTrips(db) {
      load(db, 'truck_trips', [
        {name: 'route_id', type: 'INTEGER'},
        {name: 'trip_id', type: 'INTEGER'},
        {name: 'trip_headsign', type: 'TEXT'},
        {name: 'service_id', type: 'TEXT'},
        {name: 'po_number', type: 'TEXT'},
      ]);
    }

    this.db = new sqlite3.Database(':memory:');
    this.db.serialize(() => {
      loadCalendarDates(this.db);
      loadTruckRoutes(this.db);
      loadTruckStops(this.db);
      loadTruckStopTimes(this.db);
      loadTruckTrips(this.db);
    });
  }

  getCalendarDates() {
    return this.db.allAsync('SELECT * FROM calendar_dates ORDER BY service_id');
  }

  getTruckRouteById(route_id) {
    return this.db.getAsync('SELECT * FROM truck_routes WHERE route_id = $route_id', {
      $route_id: route_id
    });
  }

  getTruckStopInfoForTrip(trip_id) {
    return this.db.allAsync(
      ` SELECT st.arrival_time as arrival_time, st.departure_time as departure_time,
               st.stop_id as stop_id, st.stop_sequence as stop_sequence,
               s.stop_lat as lat, s.stop_lon as lng, s.stop_name as stop_name, cd.date as date
        FROM truck_stop_times as st
          INNER JOIN truck_stops as s
          INNER JOIN calendar_dates AS cd
          INNER JOIN truck_trips AS t
        WHERE st.trip_id = $trip_id
          AND st.stop_id = s.stop_id
          AND st.trip_id = t.trip_id
          AND t.service_id = cd.service_id
        ORDER BY departure_time`,
      {$trip_id: trip_id}
    );
  }

  getTruckTripsOrderedByTime() {
    return this.db.allAsync(
      ` SELECT t.route_id AS route_id, 
               t.trip_headsign AS trip_headsign,
               t.po_number AS po_number, 
               t.trip_id AS trip_id,
               c.date AS departure_date,
             ( SELECT departure_time FROM truck_stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_time,
             ( SELECT stop_id FROM truck_stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_stop_id
        FROM truck_trips AS t INNER JOIN calendar_dates AS c
        WHERE t.service_id = c.service_id
        ORDER BY departure_date, departure_time`
    );
  }
};
