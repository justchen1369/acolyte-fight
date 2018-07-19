import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';

import { ButtonBar } from '../game/constants';

import { InfoPanel } from './infoPanel';
import { MessagesPanel } from './messagesPanel';
import { CanvasPanel } from './canvasPanel';

interface Props {
    playerName: string;
    world: w.World;
    items: s.NotificationItem[];
    newGameCallback: () => void;
    exitGameCallback: () => void;
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
        const world = this.props.world;

        // Offset the messages from the button bar
        let marginBottom = 0;
        let marginLeft = 0;
        const buttonBar = world.ui.buttonBar;
        if (world.ui.buttonBar) {
            if (buttonBar.vertical) {
                marginLeft = ButtonBar.Size * buttonBar.scaleFactor + ButtonBar.Margin * 2;
            } else {
                marginBottom = ButtonBar.Size * buttonBar.scaleFactor + ButtonBar.Margin * 2;
            }
        }

        const allowExit = world.activePlayers.size <= 1 || !!world.winner || !world.ui.myHeroId;
        return (
            <div id="game-panel">
                <CanvasPanel world={this.props.world} />
                <InfoPanel
                    playerName={this.props.playerName}
                    world={this.props.world} />
                <MessagesPanel
                    style={{ marginLeft, marginBottom }}
                    world={this.props.world}
                    items={this.props.items}
                    newGameCallback={this.props.newGameCallback}
                    exitGameCallback={this.props.exitGameCallback} />
                {allowExit && <a className="exit-link" href="#" onClick={() => this.props.exitGameCallback()} style={{marginLeft}}>
                    <i className="fa fa-times-circle" /> Exit Game
                </a>}
            </div>
        );
    }
}