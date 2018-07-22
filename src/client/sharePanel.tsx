import * as React from 'react';
import * as rooms from './rooms';
import * as url from './url';
import { Mod } from '../game/settings';

interface Props {
    current: url.PathElements;
}
interface State {
    error: string;
}

export class SharePanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
        };
    }

    render() {
        return <div>
            {this.props.current.room ? this.renderCurrentRoom() : this.renderNewRoom()}
            <h1>Chat</h1>
            <p><a href="https://discord.gg/sZvgpZk" target="_blank">Join the chat on Discord!</a></p>
            <h1>Social Media</h1>
            <p>
                <ul>
                    <li><a href="http://twitter.com/acolytefight" target="_blank">Twitter</a></li>
                    <li><a href="http://twitch.com/acolytefight" target="_blank">Twitch</a></li>
                    <li><a href="https://www.youtube.com/channel/UCJr11iCM_aigs5mCqhF_H2g" target="_blank">YouTube</a></li>
                    <li><a href="http://instagram.com/acolytefight" target="_blank">Instagram</a></li>
                    <li><a href="http://facebook.com/acolytefight" target="_blank">Facebook</a></li>
                    <li><a href="https://medium.com/acolytefight" target="_blank">Medium</a></li>
                    <li><a href="https://acolytefight.tumblr.com" target="_blank">Tumblr</a></li>
                </ul>
            </p>
        </div>
    }

    private renderCurrentRoom() {
        const currentRoomPath = url.getRoomHomePath(this.props.current);
        return <div>
            <h1>Current room</h1>
            <p>
                You are currently in room <b><a href={currentRoomPath}>{this.props.current.room}</a></b>.
                Invite friends to this room by sending the following URL:
                <input className="share-url" type="text" value={window.location.origin + currentRoomPath} readOnly onFocus={ev => ev.target.select()} />
            </p>
            <p><div className="btn" onClick={() => this.exitRoom()}>Exit room</div></p>
            <h2>Room modifications</h2>
            {Object.keys(Mod).length > 0
                ? <p>
                    The following modifications are active in this room:
                    <textarea className="mod-json">{JSON.stringify(Mod, null, 2)}</textarea>
                </p>
                : <p>No modifications are in effect in this room.</p>}
        </div>
    }

    private renderNewRoom() {
        return <div>
            <h1>Private room</h1>
            <p>Create a private room to play with friends!</p>
            <p><div className="btn" onClick={() => this.onSubmit()}>Create Room</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
        </div>;
    }

    private exitRoom() {
        window.location.href = url.exitRoomPath(this.props.current);
    }

    private onSubmit() {
        rooms.createRoomFromMod({}, this.props.current)
            .catch(error => {
                console.error(error);
                this.setState({ error: `${error}` });
            });
    }
}