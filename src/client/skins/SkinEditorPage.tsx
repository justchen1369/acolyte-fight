import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as h from '../graphics/character/character.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

interface Props {
}

interface State {
}

function stateToProps(state: s.State): Props {
    return {
    };
}

class SkinEditorPage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div></div>
    }
}

export default ReactRedux.connect(stateToProps)(SkinEditorPage);