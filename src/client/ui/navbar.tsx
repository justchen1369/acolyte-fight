import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';
import LoginButton from './loginButton';
import NavBarItem from './navbarItem';

interface Props {
    isLoggedIn: boolean;
    isUsingAI: boolean;
    isModded: boolean;
    inParty: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        isLoggedIn: !!state.userId,
        isUsingAI: !!state.aiCode,
        isModded: Object.keys(state.room.mod).length > 0,
        inParty: !!state.party,
    };
}

class NavBar extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }
    render() {
        return <div className="navbar">
            <NavBarItem page="">Home</NavBarItem>
            <NavBarItem page="leaderboard">Leaderboard</NavBarItem>
            {(this.props.isLoggedIn || this.props.isModded) && <NavBarItem page="modding" hideOnMobile={true} badge={this.props.isModded}>Modding</NavBarItem>}
            {(this.props.isLoggedIn || this.props.isUsingAI) && <NavBarItem page="ai" hideOnMobile={true} badge={this.props.isUsingAI}>AI</NavBarItem>}
            <NavBarItem page="regions">Regions</NavBarItem>
            <NavBarItem page="party" badge={this.props.inParty} hideOnMobile={true}>Party</NavBarItem>
            <NavBarItem page="about" hideOnMobile={true}>About</NavBarItem>
            <div className="spacer" />
            <LoginButton />
        </div>
    }

}

export default ReactRedux.connect(stateToProps)(NavBar);