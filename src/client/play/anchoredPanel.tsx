import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';

export interface OwnProps {
    anchorLeft?: boolean;
    anchorRight?: boolean;
    anchorBottom?: boolean;
    anchorTop?: boolean;
}

interface Props extends OwnProps {
    buttonBar: w.ButtonConfig;
    wheelOnRight?: boolean;
    Visuals: VisualSettings;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const world = state.world;
    return {
        ...ownProps,
        buttonBar: world.ui.buttonBar,
        wheelOnRight: state.options.wheelOnRight,
        Visuals: world.settings.Visuals,
    };
}

class AnchoredPanel extends React.PureComponent<Props> {
    render() {
        const Visuals = this.props.Visuals;

        let top: number = undefined;
        let bottom: number = undefined;
        let left: number = undefined;
        let right: number = undefined;

        if (this.props.anchorBottom) {
            const buttonBar = this.props.buttonBar;
            if (buttonBar && buttonBar.view === "bar") {
                bottom = Visuals.ButtonBarSize * buttonBar.scaleFactor + Visuals.ButtonBarMargin * 2;
            } else {
                bottom = 0;
            }
        }

        if (this.props.anchorLeft) {
            left = 0;
        }
        if (this.props.anchorRight) {
            right = 0;
        }

        if (this.props.anchorTop) {
            top = 0;
        }

        return <div className="anchored-panel" style={{ left, top, right, bottom }}>{this.props.children}</div>;
    }
}

export default ReactRedux.connect(stateToProps)(AnchoredPanel);