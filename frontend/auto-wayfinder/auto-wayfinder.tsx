import * as React from 'react';
import GoogleMapReact from 'google-map-react';

// Include our SCSS (via webpack magic)
import './auto-wayfinder.scss';

import * as marker from './images/you-are-here.svg';

interface Props {
    lat: number;
    lng: number;
    zoom?: number;
}

const PlaceMarker: React.SFC<Props> = () => <img className="here" src={marker} alt="You are Here" />;

export class AutoWayfinder extends React.Component<Props> {
    render() {
        return (
            <div className="auto-wayfinder-container">
                <GoogleMapReact
                    bootstrapURLKeys={{key: 'api-goes-here' }}
                    defaultCenter={{lat: this.props.lat, lng: this.props.lng}}
                    defaultZoom={this.props.zoom ? this.props.zoom : 15}
                    options={{
                        zoomControl: false,
                        gestureHandling: 'cooperative',
                        styles: [{"featureType":"administrative","elementType":"all","stylers":[{"saturation":"-100"}]},{"featureType":"administrative.province","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":"-100"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"lightness":"30"}]},{"featureType":"road.local","elementType":"all","stylers":[{"lightness":"40"}]},{"featureType":"transit","elementType":"all","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]},{"featureType":"water","elementType":"labels","stylers":[{"lightness":-25},{"saturation":-100}]}]
                    }}
                >
                    <PlaceMarker
                        lat={this.props.lat}
                        lng={this.props.lng}
                    />
                </GoogleMapReact>
            </div>
        );
    }
}