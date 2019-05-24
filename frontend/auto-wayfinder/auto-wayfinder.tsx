import * as React from 'react';
import GoogleMapReact from 'google-map-react';

import { googleMapStyles, GOOGLE_MAPS_API_KEY, LostMarker, StartMarker, MapProps } from './gmaps-constants';

const handleApiLoaded = (map: object, maps: object) => {
    // required to use map and maps objects
};

export class AutoWayfinder extends React.Component<MapProps> {
    render() {
        return (
            <div className="auto-wayfinder-container">
                <GoogleMapReact
                    bootstrapURLKeys={{key: GOOGLE_MAPS_API_KEY }}
                    defaultCenter={{lat: this.props.lat, lng: this.props.lng}}
                    defaultZoom={this.props.zoom ? this.props.zoom : 16}
                    yesIWantToUseGoogleMapApiInternals
                    onGoogleApiLoaded={({ map, maps }) => handleApiLoaded(map, maps)}
                    options={{
                        zoomControl: true,
                        // requires map and maps objects
                        mapTypeControl: true,
                        ...(this.props.lost ? {gestureHandling: 'none'} : {gestureHandling: 'cooperative'}),
                        styles: googleMapStyles,
                    }}
                >
                    {this.props.lost ? (
                        <LostMarker lat={this.props.lat} lng={this.props.lng} />
                    ) : (
                        <StartMarker lat={this.props.lat} lng={this.props.lng} />
                    )}
                </GoogleMapReact>
            </div>
        );
    }
}