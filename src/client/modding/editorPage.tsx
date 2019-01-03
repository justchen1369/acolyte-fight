import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import CodeEditor from './codeEditor';
import ModBar from './modBar';
import NavBar from '../nav/navbar';

interface OwnProps {
    expand?: boolean;
}
interface Props extends OwnProps {
    mod: Object;
    selfId: string;
    party: s.PartyState;
    isLoggedIn: boolean;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        mod: state.room.mod,
        selfId: state.socketId,
        party: state.party,
        isLoggedIn: state.loggedIn,
    };
}

class EditorPage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    render() {
        if (!this.props.isLoggedIn) {
            return this.renderNotLoggedIn();
        } else if (!this.isAdmin()) {
            return this.renderReadonly();
        } else {
            return this.renderEditor();
        }
    }

    private renderNotLoggedIn() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <h1>Modding</h1>
                <p>Modding allows you to change the rules of the game.</p>
                <div className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to access modding tools</div>
            </div>
        </div>;
    }

    private renderReadonly() {
        return <div className="content-container">
            <NavBar />
            <div className="page mod-readonly">
                <h1>Modding</h1>
                <p>Modding allows you to change the rules of the game.</p>
                {Object.keys(this.props.mod).length > 0 && <p>
                    Currently, the following modifications will affect your games:
                    <CodeEditor code={JSON.stringify(this.props.mod, null, "\t")} />
                </p>}
                <p>Only the party leader can change the mod.</p>
            </div>
        </div>
    }

    private renderEditor() {
        if (this.props.expand) {
            return <div className="content-container full-height-page">
                <ModBar />
                {this.props.children}
            </div>
        } else {
            return <div className="content-container">
                <ModBar />
                <div className="page">
                    {this.props.children}
                </div>
            </div>
        }
    }

    private isAdmin() {
        if (this.props.party) {
            return this.props.party.members.some(m => m.isLeader && m.socketId === this.props.selfId);
        } else {
            return true;
        }
    }
}

export default ReactRedux.connect(stateToProps)(EditorPage);