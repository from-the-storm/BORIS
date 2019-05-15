import * as React from 'react';
import GoogleMapReact from 'google-map-react';

import { MapStepUiState } from '../../../common/game';
import { GOOGLE_MAPS_API_KEY, googleMapStyles, StartMarker } from '../../auto-wayfinder/gmaps-constants';



interface Props extends MapStepUiState {
}

export class MapStep extends React.PureComponent<Props> {
    public render() {
        return (
            <div className="chat-segment">
                <div className="map-step-map">
                    <GoogleMapReact
                        bootstrapURLKeys={{key: GOOGLE_MAPS_API_KEY }}
                        defaultCenter={{lat: this.props.latitude, lng: this.props.longitude}}
                        defaultZoom={this.props.zoomLevel}
                        options={{
                            zoomControl: true,
                            gestureHandling: 'cooperative',
                            styles: googleMapStyles,
                        }}
                    >
                        <StartMarker lat={this.props.latitude} lng={this.props.longitude} />
                    </GoogleMapReact>
                </div>
                <p dangerouslySetInnerHTML={{__html: this.props.messageHTML}}></p>
            </div>
        );
    }
}
