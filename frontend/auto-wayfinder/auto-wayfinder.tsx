import * as React from 'react';
import GoogleMapReact from 'google-map-react';

// Include our SCSS (via webpack magic)
import './auto-wayfinder.scss';

import * as marker from './images/you-are-here.svg';

interface Props {
    lat: number;
    lng: number;
}

const PlaceMarker: React.SFC<Props> = () => <img className="here" src={marker} alt="You are Here" />;

export class AutoWayfinder extends React.Component<Props> {
    render() {
        return (
            <div className="auto-wayfinder-container">
                <GoogleMapReact
                    bootstrapURLKeys={{key: 'api-key-here' }}
                    defaultCenter={{lat: this.props.lat, lng: this.props.lng}}
                    defaultZoom={15}
                    options={{gestureHandling: 'none', zoomControl: false}}
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