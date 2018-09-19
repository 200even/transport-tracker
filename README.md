Transport Tracker
=================

Transport Tracker is a set of applications designed to track a
range of moving assets (such as vehicles) and visualize them on a live map. The
applications use a mixture of technologies - Android, Firebase,
Google Maps, GTFS (General Transit Feed Specification), and more.

## Overview

This project is written in Node.js and running on Google Compute
Engine, which receives the locations reported by truck simulator along with a
time table provided in GTFS format, and makes regular updates to a Firebase
Real Time Database.

## Getting started

###Set up a Firebase Realtime Database
- Go to the Firebase console and click Add project to create a project for your Transport Tracker.
- Enter a project name.
- Click Create Project.

###Get a Google Maps API Key
https://cloud.google.com/maps-platform/#get-started

###Set up the backend
1. Get your Firebase web app credentials:
    - Go to the Firebase console and open your Firebase project.
    - Click Add Firebase to your web app.
    - Go to the Service Accounts tab in your Firebase project's settings.
    - Click Generate New Private Key and confirm the action as prompted.
    - Firebase downloads an adminsdk JSON file containing your service account credentials. Store this file for later use.

2. Edit the file serviceAccountKey.json, and paste in your Firebase adminsdk service account credentials from the file you downloaded earlier.

3. Edit the tracker_configuration.jsonfile and add the following values:

    - mapsApiKey - your Maps API key. If you don't have one yet, follow the guide to getting an API key.
    - databaseURL - the address of your Firebase Realtime Database. You can find the URL in the Admin SDK configuration snippet on the Firebase Service Accounts tab.
    - simulation - a configuration setting that determines whether to use the vehicle simulator or real location data from the vehicle locator. While developing and testing, set this value to true.

4. Install dependencies and run the application
```angular2html
    yarn install
    yarn main
```
Open your Firebase Realtime Database to see the results

This project is based on an open source bus tracker. For
if you have questions that aren't answered here, please see 
[Transport Tracker Backend codelab](https://codelabs.developers.google.com/codelabs/transport-tracker-backend/)
