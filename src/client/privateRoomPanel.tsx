import * as React from 'react';
import * as m from '../game/messages.model';

interface Props {
}
interface State {
    roomUrl: string;
}

function retrieveLocationAsync() {
    return fetch('api/location', { credentials: "same-origin" })
        .then(res => res.json())
        .then((msg: m.LocationMsg) => msg);
}

export class PrivateRoomPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            roomUrl: null,
        };
    }

    componentDidMount() {
        retrieveLocationAsync().then(locationMsg => {
            const room = Math.floor(Math.random() * 1e9).toString(36);
            const server = locationMsg.currentServer;

            let roomUrl = `?room=${room}`;
            if (locationMsg.currentServer) {
                roomUrl = `${roomUrl}&server=${encodeURIComponent(server)}`;
            }
            this.setState({ roomUrl });
        }).catch((error) => {
            console.error("Unable to generate room URL", error);
        });
    }

    render() {
        return <div>
            <h1>Private room</h1>
            <p>
                {this.state.roomUrl
                ? <a href={this.state.roomUrl}>Click here to create a private room.</a>
                : <span>Generating private room URL...</span>}
                {' '}
                Share this link with your friends to play against them!
            </p>
        </div>;
    }
}