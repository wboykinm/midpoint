mapboxgl.accessToken = 'pk.eyJ1IjoiZmFyYWRheTIiLCJhIjoiTUVHbDl5OCJ9.buFaqIdaIM3iXr1BOYKpsQ';

// define the start/end points
var startSites = [[-73.53873,41.05343],[-73.41335,41.48143]];

// set up the map
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/faraday2/cih81t9p40010k6lyiniupn8s',
  center: [-96, 39],
  zoom: 3.5,
  pitch: 0,
  bearing: 0
})
.on('style.load', geoFindMe());

function getBars(origins){
  if (map.getSource('route')) {
    map.removeSource('route');
    map.removeSource('midPoint');
    map.removeSource('bars');
  };

  //define directions parameters:
  var pathLine = { type: 'Feature', properties: {} };
  var waypoints = origins[0][0] + ',' + origins[0][1] + ';' + origins[1][0] + ',' + origins[1][1];
  var url = 'https://api.mapbox.com/v4/directions/mapbox.driving/' + waypoints + '.json?access_token=' + mapboxgl.accessToken;

  // hit the directions api and select the route geometry
  fetch(url).then(function(response) {
    return response.json();
  }).then(function(j) {
    pathLine.geometry = j.routes[0].geometry;
    return pathLine;
  })
  .then(function(pathLine){
    // add the route to the map
    map.addSource("route", {
      "type": "geojson",
      "data": pathLine
    });
    map.addLayer({
      "id": "route",
      "type": "line",
      "interactive": true,
      "source": "route",
      "layout": {
        "line-join": "round",
        "line-cap": "round"
      },
      "paint": {
        "line-color": "#2B3E51",
        "line-width": 6,
        "line-dasharray": [1,2],
        "line-opacity": 0.9
      }
    });
    return pathLine
  })
  .then(function(pathLine){
    // figure out the length of the route
    // (probably available in the response above,
    // but what the hell)
    return turf.lineDistance(pathLine,'miles');
  })
  .then(function(travelLength){
    // find the location of the halfway point on the route
    return turf.along(pathLine,(travelLength/2),'miles');
  })
  .then(function(midPoint){
    // add the midpoint to the map
    map.addSource("midPoint", {
      "type": "geojson",
      "data": {
        "type": "FeatureCollection",
        "features": [midPoint]
      }
    });
    // add source as a layer and apply some styles
    map.addLayer({
      "id": "midPoint",
      "interactive": true,
      "type": "symbol",
      "source": "midPoint",
      "layout": {
        "icon-image": "pin2",
        "icon-size":0.4,
        "text-field": "Travel Midpoint",
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-offset": [0, 1.2],
        "text-anchor": "top"
      },
      "paint": {
        "text-size": 18
      }
    });
    return midPoint;
  })
  .then(function(midPoint){
    // construct a call to the foursquare api for
    // venues within 15km of the midpoint
    var cId = 'RU314UA4LCIVRLMV5O2GZDK5W253WBGBBW3WMFACFMYGH0QH';
    var cSecret = 'CL3JBZ1Q150J0X1L30LISC0VM21T2DP4N2IICRLVSSJMKMJU';
    var foursquare_url = 'https://api.foursquare.com/v2/venues/explore' +
      '?client_id=' + cId +
      '&client_secret=' + cSecret +
      '&v=20151115' +
      //'&intent=browse' +
      '&radius=8000' +
      '&ll=' + midPoint.geometry.coordinates[1] + ',' + midPoint.geometry.coordinates[0] +
      '&section=drinks' +
      '&callback=';
    return foursquare_url;
  })
  .then(function(foursquare_url){
    // make the call to the foursquare api, add the results to the map
    function status(response) {
      if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response)
      } else {
        return Promise.reject(new Error(response.statusText))
      }
    }

    function json(response) {
      return response.json()
    }

    fetch(foursquare_url)
      .then(status)
      .then(json)
      .then(function(data) {
        // add the results to the map
        var barSites = data.response.groups[0].items;
        var barGeojson = [];
        for (var i = 0; i < barSites.length; i++) {
          var barFeature = {
            type: 'Feature',
            properties: {
              name: barSites[i].venue.name,
              address: barSites[i].venue.location.address + ', ' + barSites[i].venue.location.city + ' ' + barSites[i].venue.location.state + ' ' + barSites[i].venue.location.postalCode,
              url: barSites[i].venue.url
            },
            geometry: {
              type: 'Point',
              coordinates: [
                barSites[i].venue.location.lng,
                barSites[i].venue.location.lat
              ]
            }
          }
          barGeojson.push(barFeature);
        }

        // add the midpoint to the map
        map.addSource("bars", {
          "type": "geojson",
          "data": {
            "type": "FeatureCollection",
            "features": barGeojson
          }
        });
        // add source as a layer and apply some styles
        map.addLayer({
          "id": "bars",
          "interactive": true,
          "type": "symbol",
          "source": "bars",
          "layout": {
            "icon-image": "beer2",
            "text-field": "{name}",
            "text-font": ["Open Sans Italic", "Arial Unicode MS Bold"],
            "text-offset": [0.6, 0.6],
            "text-anchor": "left"
          },
          "paint": {
            "text-size": 12
          }
        });

        // set up the interaction functions
        map.on('click', function (e) {
          map.featuresAt(e.point, {layer: 'bars', radius: 15, includeGeometry: true}, function (err, features) {
            if (err) throw err;
            if (features.length) {
              var tooltip = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML('<h1><a href="' + features[0].properties.url + '" target="_blank">' + features[0].properties.name + '</a></h1><p>' + features[0].properties.address + '</p>')
                .addTo(map);
            }
          });
        });

        map.on('mousemove', function (e) {
          map.featuresAt(e.point, {layer: 'bars', radius: 15}, function (err, features) {
            if (err) throw err;
            map.getCanvas().style.cursor = features.length ? "pointer" : "";
          });
        });

        // pan to cover the target locations
        var mapExtent = turf.bboxPolygon(turf.extent(turf.featurecollection(barGeojson)));
        var mapBounds = [];
        mapBounds.push(mapExtent.geometry.coordinates[0][0], mapExtent.geometry.coordinates[0][2]);
        map.fitBounds(mapBounds, { speed: 0.8, padding: 70, bearing: 0 })
      }).catch(function(error) {
        console.log('Request failed', error);
      });
  })
};

function geocodeOnce(origin) {
  var geocodeUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + origin + '.json?access_token=' + mapboxgl.accessToken
  return fetch(geocodeUrl).then(function(response) {
    return response.json();
  }).then(function(parsed) {
    return parsed.features[0].geometry.coordinates;
  })
}

function geocode() {
  var origins = [].slice.call(arguments);
  return Promise.all(origins.map(geocodeOnce));
}

function doGeocode() {
  return geocode(document.getElementById('start1').value, document.getElementById('start2').value);
}

function send() {
  doGeocode()
    .then(function(sites) {
      getBars(sites);
    });
}

function geoFindMe() {
  if (!navigator.geolocation){
    alert('Geolocation is not supported by your browser');
    return;
  }
  function success(position) {
    var latitude  = position.coords.latitude;
    var longitude = position.coords.longitude;
    rUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + longitude + ',' + latitude + '.json?access_token=' + mapboxgl.accessToken
    //document.getElementById('start1').value = latitude;
    // move to the current location
    map.easeTo({
      center:[longitude, latitude],
      zoom:8,
      pitch:35,
      duration:2500
    });
    // get the best placename for it
    fetch(rUrl).then(function(response) {
      return response.json();
    }).then(function(h) {
      document.getElementById('start1').value = h.features[2].place_name;
      console.log(h.features[2].place_name);
    });
  };
  function error() {
    alert('Unable to retrieve your location');
  };
  navigator.geolocation.getCurrentPosition(success, error);
}
