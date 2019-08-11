import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';

export interface OwnProps {
    className?: string;
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

        let classNames = ["anchored-panel"];
        let style: React.CSSProperties = {};

        if (this.props.anchorBottom) {
            const buttonBar = this.props.buttonBar;
            if (buttonBar && buttonBar.view === "bar") {
                style.bottom = Visuals.ButtonBarSize * buttonBar.scaleFactor + Visuals.ButtonBarMargin * 2;
            } else {
                style.bottom = 0;
            }

            classNames.push("anchored-panel-bottom");
        }

        if (this.props.anchorLeft) {
            style.left = 0;
            classNames.push("anchored-panel-left");
        }
        if (this.props.anchorRight) {
            style.right = 0;
            classNames.push("anchored-panel-right");
        }

        if (this.props.anchorTop) {
            style.top = 0;
            classNames.push("anchored-panel-top");
        }

        if (this.props.className) {
            classNames.push(this.props.className);
        }

        return <div className={classNames.join(" ")} style={style}>{this.props.children}</div>;
    }
}

export default ReactRedux.connect(stateToProps)(AnchoredPanel);