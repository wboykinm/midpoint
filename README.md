# midpoint
[Find highly-rated foursquare venues](https://wboykinm.github.io/midpoint/) within a short distance of the halfway point in a route, then navigate to them from both points of origin.

![screen](screen.png)

Also handles URL parameters: `start1=` and `start2=`, e.g.

[https://wboykinm.github.io/midpoint/?start1=60 California St San Francisco, CA &start2=361 Frederick St San Francisco, CA ](https://wboykinm.github.io/midpoint/?start1=60 California St San Francisco, CA &start2=361 Frederick St San Francisco, CA)

## Requirements
This is a static app, but you'll need two API keys:

- Mapbox Key used [here](https://github.com/wboykinm/midpoint/blob/master/midpoint.js#L1) and [here](https://github.com/wboykinm/midpoint/blob/master/nav/index.html#L46) - get one [here](https://www.mapbox.com/studio/signup/)
- Foursquare API key used [here](https://github.com/wboykinm/midpoint/blob/master/midpoint.js#L118-L119) - get one [here](https://foursquare.com/developers/register)
