import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as storage from '../storage';
import * as url from '../url';

interface Props {
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
    };
}

export class DebugPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div>
            <h1>Debug</h1>
            <p><div className="btn" onClick={() => this.clearData()}>Clear all data</div></p>
        </div>
    }

    private async clearData() {
        await storage.clear();
        console.log("Cleared data");
    }
}

export default ReactRedux.connect(stateToProps)(DebugPanel);