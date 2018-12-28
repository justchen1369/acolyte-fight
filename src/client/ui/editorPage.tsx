import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import ModEditor from '../modding/modEditor';
import NavBar from './navbar';

interface Props {
    mod: Object;
    selfId: string;
    party: s.PartyState;
    isLoggedIn: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
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
                <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to access modding tools</p>
            </div>
        </div>;
    }

    private renderReadonly() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <h1>Modding</h1>
                <p>Modding allows you to change the rules of the game.</p>
                {Object.keys(this.props.mod).length > 0 && <p>
                    Currently, the following modifications will affect your games:
                    <textarea className="mod-json">{JSON.stringify(this.props.mod, null, "\t")}</textarea>
                </p>}
                <p>Only the party leader can change the mod.</p>
            </div>
        </div>
    }

    private renderEditor() {
        return <ModEditor mod={this.props.mod} />;
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