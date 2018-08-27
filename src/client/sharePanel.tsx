import * as React from 'react';
import * as rooms from './rooms';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as url from './url';
import { PartyPanel } from './partyPanel';

interface Props {
    current: url.PathElements;
    party: s.PartyState;
    mod: Object;
    allowBots: boolean;
    changePage: (newPage: string) => void;
    createPartyCallback: () => void;
    leavePartyCallback: (partyId: string) => void;
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
            <PartyPanel
                current={this.props.current}
                changePage={this.props.changePage}
                mod={this.props.mod}
                allowBots={this.props.allowBots}
                party={this.props.party}
                createPartyCallback={this.props.createPartyCallback}
                leavePartyCallback={this.props.leavePartyCallback}
            />
            <h1>Community</h1>
            <p className="share"><a href="https://discord.gg/sZvgpZk" target="_blank"><i className="fab fa-discord" /><span>Join the chat on Discord!</span></a></p>
            <p className="share"><a href="http://twitter.com/acolytefight" target="_blank"><i className="fab fa-twitter-square" /><span>@acolytefight</span></a></p>
            <p className="share"><a href="http://facebook.com/acolytefight" target="_blank"><i className="fab fa-facebook" /><span>fb.com/acolytefight</span></a></p>
        </div>
    }
}