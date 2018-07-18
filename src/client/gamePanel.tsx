import pl from 'planck-js';
import * as React from 'react';
import * as s from './store.model';

import { InfoPanel } from './infoPanel';
import { MessagesPanel } from './messagesPanel';
import { CanvasPanel } from './canvasPanel';

interface Props {
    playerName: string;
    store: s.Store;
    newGameCallback: () => void;
}
interface State {
}

export class GamePanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <div id="game-panel">
                <CanvasPanel world={this.props.store.world} />
                <InfoPanel playerName={this.props.playerName} store={this.props.store} />
                <MessagesPanel store={this.props.store} newGameCallback={this.props.newGameCallback} />
            </div>
        );
    }
}