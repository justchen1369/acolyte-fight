import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as ticker from '../core/ticker';
import { isMobile } from '../core/userAgent';

interface Props {
    myGameId: string;
    myHeroId: string;
}
interface State {
    text: string;
    focus: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        myGameId: state.world.ui.myGameId,
        myHeroId: state.world.ui.myHeroId,
    };
}

class TextMessageBox extends React.Component<Props, State> {
    private keyDownListener = this.onWindowKeyDown.bind(this);
    private textMessageBox: HTMLInputElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            text: "",
            focus: false,
        };
    }

    componentWillMount() {
        window.addEventListener('keydown', this.keyDownListener);

    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.keyDownListener);
    }

    render() {
        if (!(this.props.myGameId && this.props.myHeroId)) {
            return null;
        }

        return <div className="text-message-container" onClick={() => this.onTextMessageContainerClick()}>
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
        </div>;
    }

    private renderHint() {
        if (this.state.focus) {
            return <div className="hint">Send message</div>;
        } else if (isMobile) {
            return <div className="hint"><i className="fas fa-comment" /> chat</div>;
        } else {
            return <div className="hint">Press <span className="hint-enter-key">ENTER</span> to chat</div>;
        }
    }

    private onTextMessageContainerClick() {
        this.focus();
    }

    private onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ text: ev.target.value });
    }

    private onKeyDown(ev: React.KeyboardEvent) {
        ev.stopPropagation();
        if (ev.keyCode === 13) {
            if (this.state.text && this.state.text.length > 0) {
                ticker.sendTextMessage(this.props.myGameId, this.props.myHeroId, this.state.text);
            }
            this.blur();
        } else if (ev.keyCode === 27) {
            this.blur();
        }
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
    
    private blur() {
        this.setState({ text: "", focus: false });
        if (this.textMessageBox) {
            this.textMessageBox.blur();
        }
    }
}

export default ReactRedux.connect(stateToProps)(TextMessageBox);