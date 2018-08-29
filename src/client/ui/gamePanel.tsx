import * as React from 'react';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from '../core/matches';
import * as screenLifecycle from './screenLifecycle';
import { worldInterruptible } from '../core/matches';

import { ButtonBar } from '../../game/constants';

import { InfoPanel } from './infoPanel';
import { MessagesPanel } from './messagesPanel';
import { CanvasPanel } from './canvasPanel';

interface Props {
    party: s.PartyState;
    isNewPlayer: boolean;
    playerName: string;
    world: w.World;
    items: s.NotificationItem[];
    connected: boolean;
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
        if (buttonBar) {
            if (buttonBar.view === "bar") {
                marginBottom = ButtonBar.Size * buttonBar.scaleFactor + ButtonBar.Margin * 2;
            } else if (buttonBar.view === "wheel") {
                marginLeft = buttonBar.region.right;
            }
        }

        const allowExit = worldInterruptible(world) || !this.props.connected
        return (
            <div id="game-panel">
                <CanvasPanel world={this.props.world} />
                <InfoPanel
                    playerName={this.props.playerName}
                    world={this.props.world}
                />
                <MessagesPanel
                    style={{ marginLeft, marginBottom }}
                    party={this.props.party}
                    isNewPlayer={this.props.isNewPlayer}
                    world={this.props.world}
                    items={this.props.items}
                />
                {allowExit && <a className="exit-link" href="#" onClick={(ev) => this.onExitClicked(ev)}>
                    <i className="fa fa-chevron-left" /> Back to Home
                </a>}
            </div>
        );
    }

    private onExitClicked(ev: React.MouseEvent) {
        screenLifecycle.exitGame();
        matches.leaveCurrentGame();
    }
}