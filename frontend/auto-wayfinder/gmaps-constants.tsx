/**
 * Google Maps constants and components
 */
import * as React from 'react';

// Google Maps API key. Doesn't need to be private.
export const GOOGLE_MAPS_API_KEY = 'AIzaSyACF7w2EwXqEZiPFvmctWPmOudRafG4sUc';

export const googleMapStyles = [
    {featureType: 'all', elementType: "geometry.stroke", stylers: [{"lightness":"-15"}]},
    {featureType: 'all', elementType: "labels.text.fill", stylers: [{"lightness":"-100"}]},
    {featureType: 'administrative', elementType: "all", stylers: [{"saturation":"-100"}]},
    {featureType: 'administrative.province', elementType: "all", stylers: [{"visibility":"off"}]},
    {featureType: 'landscape', elementType: "all", stylers: [{"saturation":-100},{"lightness":65},{"visibility":"on"}]},
    {featureType: 'landscape.man_made', elementType: "geometry.stroke", stylers: [{"visibility":"on"},{"lightness":-15}]},
    {featureType: 'poi', elementType: "all", stylers: [{"saturation":-100},{"lightness":40},{"visibility":"simplified"}]},
    {featureType: 'road', elementType: "all", stylers: [{"saturation":"-100"}]},
    {featureType: 'road.highway', elementType: "all", stylers: [{"visibility":"simplified"}]},
    {featureType: 'road.arterial', elementType: "all", stylers: [{"lightness":"30"}]},
    {featureType: 'road.local', elementType: "all", stylers: [{"lightness":"40"}]},
    {featureType: 'transit', elementType: "all", stylers: [{"saturation":-100},{"visibility":"simplified"}]},
    {featureType: 'water', elementType: "geometry", stylers: [{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]},
    {featureType: 'water', elementType: "geometry.fill", stylers: [{"lightness":"25"}]},
    {featureType: 'water', elementType: "labels", stylers: [{"lightness":-25},{"saturation":-100}]}
];

/////////// Markers:

import * as marker from './images/you-are-here.svg';
import * as starting from './images/starting-point.svg';

export interface MapProps {
    lat: number;
    lng: number;
    lost?: boolean;
    zoom?: number;
}
export const LostMarker: React.SFC<MapProps> = () => <img className="map-lost-marker" src={marker} alt="You Should Be Here" />;
export const StartMarker: React.SFC<MapProps> = () => <img className="map-start-marker" src={starting} alt="Scenario Start Point" />;
