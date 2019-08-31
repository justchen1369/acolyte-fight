import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as online from '../core/online';
import { isMobile } from '../core/userAgent';

const MaxCharsPerSecond = 10;

interface Props {
    live: boolean;
    numOnline: number;
    isPlaying: boolean;
}
interface State {
    text: string;
    focus: boolean;
    error: string;
}

function stateToProps(state: s.State): Props {
    return {
        live: state.world.ui.live,
        numOnline: state.online.size,
        isPlaying: !!state.world.ui.myHeroId,
    };
}

class TextMessageBox extends React.PureComponent<Props, State> {
    private keyDownListener = this.onWindowKeyDown.bind(this);
    private textMessageBox: HTMLInputElement = null;
    private previousSendMs = 0;
    private previousMessage = "";

    constructor(props: Props) {
        super(props);
        this.state = {
            text: "",
            focus: false,
            error: null,
        };
    }

    componentDidMount() {
        window.addEventListener('keydown', this.keyDownListener);

    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.keyDownListener);
    }

    render() {
        if (!this.props.live) {
            return null;
        }

        let className = "text-message-container";
        if (this.state.focus) {
            className += " text-message-focus";
        }

        return <div
            className={className}
            onTouchStart={ev => { ev.stopPropagation(); ev.preventDefault(); this.focus(); }}
            onTouchMove={ev => { ev.stopPropagation(); ev.preventDefault(); }}
            onTouchEnd={ev => { ev.stopPropagation(); ev.preventDefault(); }}
            >

            {!(this.state.text && this.state.text.length > 0) && this.renderHint()}
            <input
                ref={(textbox) => this.textMessageBox = textbox}
                className="text-message-box"
                type="text"
                maxLength={constants.MaxTextMessageLength}
                value={this.state.text}
                onChange={ev => this.onChange(ev)}
                onKeyDown={(ev) => this.onKeyDown(ev)}
            />
            {this.state.error && <div className="error">{this.state.error}</div>}
        </div>;
    }

    private renderHint() {
        if (this.state.focus) {
            return <div className="hint"><span className="text-message-row-icon"><i className="fas fa-comment" /></span> <span>Send message</span></div>;
        } else if (isMobile) {
            return <div className="hint clickable"><span className="text-message-row-icon"><i className="fas fa-comment" /></span> <span>Tap here to chat {this.renderNumPlayers()}</span></div>;
        } else {
            return <div className="hint"><span className="text-message-row-icon"><i className="fas fa-comment" /></span> <span>Press <span className="hint-enter-key">ENTER</span> to chat {this.renderNumPlayers()}</span></div>;
        }
    }

    private renderNumPlayers() {
        const numSelf = this.props.isPlaying ? 1 : 0;
        const numOthers = Math.max(0, this.props.numOnline - numSelf);
        if (numOthers >= 1) {
            return `with ${numOthers} ${numOthers === 1 ? 'player' : 'players'}`;
        } else {
            return null;
        }
    }

    private onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ text: ev.target.value });
    }

    private onKeyDown(ev: React.KeyboardEvent) {
        ev.stopPropagation();
        if (ev.keyCode === 13) {
            if (this.state.text && this.state.text.length > 0) {
                if (this.state.text === this.previousMessage) {
                    this.blur("Duplicate message");
                } else if (this.isTooMany(this.state.text.length)) {
                    this.blur("Too many messages, try again");
                } else {
                    online.sendTextMessage(this.state.text);
                    this.previousMessage = this.state.text;
                    this.previousSendMs = Date.now();
                    this.blur();
                }
            } else {
                this.blur();
            }
        } else if (ev.keyCode === 27) {
            this.blur();
        }
    }

    private isTooMany(length: number) {
        const next = this.previousSendMs + 1000 * (length / MaxCharsPerSecond);
        return next > Date.now();
    }

    private onWindowKeyDown(ev: KeyboardEvent) {
        if (ev.keyCode === 13) {
            this.focus();
        }
    }

    private focus() {
        if (this.textMessageBox) {
            this.textMessageBox.focus();
            this.setState({ focus: true });
        }
    }
    
    private blur(error: string = null) {
        this.setState({
            text: error ? this.state.text : "",
            focus: false,
            error,
        });
        if (this.textMessageBox) {
            this.textMessageBox.blur();
        }
    }
}

export default ReactRedux.connect(stateToProps)(TextMessageBox);