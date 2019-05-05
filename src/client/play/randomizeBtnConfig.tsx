import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as keyboardUtils from '../core/keyboardUtils';
import * as StoreProvider from '../storeProvider';
import { isMobile } from '../core/userAgent';
import Button from '../controls/button';

interface OwnProps {
    className?: string;
    btn?: string;
    settings: AcolyteFightSettings;
    onChosen?: (keyBindings: KeyBindings) => void;
}
interface Props extends OwnProps {
    config: KeyBindings;
    world: w.World
}

interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        config: state.keyBindings,
        world: state.world,
    };
}

class RandomizeBtnConfig extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            saved: false,
            hovering: null,
        };
    }

    render() {
        return <Button
            onTouchStart={(ev) => { ev.stopPropagation(); ev.preventDefault(); this.onClick() }}
            onTouchMove={(ev) => { ev.stopPropagation(); ev.preventDefault(); }}
            onTouchEnd={(ev) => { ev.stopPropagation(); ev.preventDefault(); }}

            className="customize-btn"
            onMouseDown={() => this.onClick()}
            onMouseEnter={() => this.onMouseEnter()}
            onMouseLeave={() => this.onMouseLeave()}
            >{this.props.children}</Button>
    }
    
    private onClick() {
        const Options = this.props.settings.Choices.Options;

        const keys = Object.keys(Options);
        const key = this.props.btn || keys[Math.floor(Math.random() * keys.length)];

        const config = { ...this.props.config };
        const currentSpellId = config[key];
        const spellIds = _.flatten(Options[key]).filter(x => x !== currentSpellId);
        config[key] = spellIds[Math.floor(Math.random() * spellIds.length)];

        keyboardUtils.updateKeyBindings(config);

        this.setState({ saved: true, hovering: null });

        if (this.props.onChosen) {
            this.props.onChosen(config);
        }

        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverRandomizer: false },
        });
    }

    private onMouseEnter() {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverRandomizer: true },
        });
    }
    private onMouseLeave() {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverRandomizer: false },
        });
    }
}

export default ReactRedux.connect(stateToProps)(RandomizeBtnConfig);