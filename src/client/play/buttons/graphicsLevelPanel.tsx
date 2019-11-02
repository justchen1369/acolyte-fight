import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../../core/cloud';
import * as r from '../../graphics/render.model';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    globalGraphics: number;
    currentGraphics: number;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        globalGraphics: state.options.graphics,
        currentGraphics: state.graphics,
    };
}

class GraphicsLevelPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        let level = _.upperFirst(r.formatGraphics(this.props.globalGraphics));
        if (r.isAutoGraphics(this.props.globalGraphics)) {
            let autoLevel = _.upperFirst(r.formatGraphics(this.props.currentGraphics));
            level += ` (${autoLevel})`;
        }
        return <ButtonRow secondary={true} label={`Graphics: ${level}`} icon="fas fa-tv" onClick={() => this.onGraphicsToggle()} />
    }

    private async onGraphicsToggle() {
        let graphics = this.props.globalGraphics;
        if (!graphics) { // Auto
            graphics = r.GraphicsLevel.Maximum;
        } else if (graphics > r.GraphicsLevel.Low) {
            --graphics;
        } else {
            graphics = null; // Set to auto
        }
        StoreProvider.dispatch({
            type: "updateOptions",
            options: { graphics },
        });
    }
}

export default ReactRedux.connect(stateToProps)(GraphicsLevelPanel);