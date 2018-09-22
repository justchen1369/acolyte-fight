import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';
import NavBarItem from './navbarItem';

interface Props {
    isUsingAI: boolean;
    isModded: boolean;
    inParty: boolean;
}

function stateToProps(state: s.State): Props {
    return {
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
            <NavBarItem page="replays">Replays</NavBarItem>
            <NavBarItem page="modding" hideOnMobile={true} badge={this.props.isModded}>Modding</NavBarItem>
            <NavBarItem page="ai" hideOnMobile={true} badge={this.props.isUsingAI}>AI</NavBarItem>
            <NavBarItem page="regions">Regions</NavBarItem>
            <NavBarItem page="party" badge={this.props.inParty}>Party</NavBarItem>
            <NavBarItem page="about">About</NavBarItem>
            <div className="spacer" />
        </div>
    }

}

export default ReactRedux.connect(stateToProps)(NavBar);