#!/bin/bash

# go to for file server http://www.transitchicago.com/downloads/sch_data/

cd gtfs
curl -o gtfs.zip http://www.transitchicago.com/downloads/sch_data/google_transit.zip
unzip gtfs.zip
# clean up
rm gtfs.zip

# remove unused files
rm agency.txt
rm calendar.txt
rm calendar_dates.txt
rm developers_license_agreement.htm
rm frequencies.txt
# rm routes.txt
rm shapes.txt
rm stop_times.txt
# rm stops.txt
rm transfers.txt
rm trips.txt
