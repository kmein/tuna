# Tuna
A MPD web server and client to listen to your favorite online radio stations.

## Features
- Allows quick switching between your favorite radio stations
- Simple and nicely designed
- Responsive web client - ready for your phone

## Configuration
### Basic settings
```
# Details of MPD server (Default: localhost:6600)
MPD_HOST=localhost
MPD_PORT=6600

# Port to serve HTTP (the user needs special permission to serve on 80; default: 4200)
PORT=4200

# JSON file with radio stations. If empty [app root]/data/stations.json will be used
STATION_FILE=
```

### Station list
`stations.json` provides MPD.FM with all the radio stations that should be shown to the users. Each station is stored as follows:
```
{   "id": 1,
    "station": "Berlin Community Radio",
    "desc": "BCR is a broadcasting platform presenting everything that is influencing Berlin",
    "logo": "http://www.berlincommunityradio.com/sites/all/themes/bcr_bootstrap/images/logospot.png",
    "stream": "http://berlincommunityradio.out.airtime.pro:8000/berlincommunityradio_a"
}
```

- **id** - A unique identifier of the station (easiest is to simply number them 1, 2, 3, ...
- **station** - Name of the station that should be displayed
- **desc** - Short description of the station (optional)
- **logo** - URL to a logo of the station (any size)
- **stream** - URL to the stream of the radio station (in a format supported by MPD such as MP3, OGG, ...)
