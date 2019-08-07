import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';
import AccountPanel from '../profiles/accountPanel';
import ControlsPanel from './controlsPanel';
import NameConfig from './nameConfig';
import SpellBtnConfig from './spellConfig';
import { isMobile } from '../core/userAgent';

interface Props {
    current: s.PathElements;
    loggedIn: boolean;
}
interface State {
    category: string;
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        loggedIn: state.loggedIn,
    };
}

export class SettingsPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            category: m.GameCategory.PvP,
        };
    }

    render() {
        return <div className="settings-panel">
            {this.props.loggedIn && <div>
                <h1>Your Account</h1>
                <AccountPanel />
            </div>}
            <h1>Your Name</h1>
            <NameConfig />
            <h1>Your Options</h1>
            <ControlsPanel />
            <h1>Your Spells</h1>
            <SpellBtnConfig />
        </div>
    }

    private onLoginClick() {
        window.location.href = "login";
    }
}

export default ReactRedux.connect(stateToProps)(SettingsPanel);