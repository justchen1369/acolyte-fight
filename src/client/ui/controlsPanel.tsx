import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as cloud from '../core/cloud';
import * as spellUtils from '../core/spellUtils';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import { isMobile } from '../core/userAgent';

namespace MoveWith {
    export const FollowCursor = "follow";
    export const Click = "click";
}

namespace Side {
    export const Left = "left";
    export const Right = "right";
}

interface Props {
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
    settings: AcolyteFightSettings;
    options: s.GameOptions;
}

interface ControlState {
    moveWith: string;
    leftClickKey: string;
    rightClickKey: string;
    actionWheelSide: string;
}
interface State extends ControlState {
    changed: boolean;
    saved: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        keyBindings: state.keyBindings,
        rebindings: state.rebindings,
        settings: state.room.settings,
        options: state.options,
    };
}

function controlConfigToState(rebindings: KeyBindings, options: s.GameOptions): ControlState {
    const moveWith = rebindings[w.SpecialKeys.Hover] === w.SpecialKeys.Move ? MoveWith.FollowCursor : MoveWith.Click;
    return {
        moveWith,
        leftClickKey: rebindings[w.SpecialKeys.LeftClick],
        rightClickKey: rebindings[w.SpecialKeys.RightClick],
        actionWheelSide: options.wheelOnRight ? Side.Right : Side.Left,
    };
}

function formatOption(key: string): string {
    return key ? key : "null";
}

function parseOption(value: string): string {
    if (value === "null") {
        return null;
    } else {
        return value;
    }
}

class ControlsPanel extends React.Component<Props, State> {
    private saveStateDebounced = _.debounce(() => this.saveState(), 500);

    constructor(props: Props) {
        super(props);

        this.state = {
            ...controlConfigToState(props.rebindings, props.options),
            changed: false,
            saved: true,
        };
    }

    componentWillReceiveProps(newProps: Props) {
        this.setState(controlConfigToState(newProps.rebindings, newProps.options));
    }

    render() {
        return <p className="controls-panel">
            {!isMobile && <div className="row">
                <span className="label">Move with</span>
                <select className="value" value={this.state.moveWith} onChange={ev => this.onMoveWithSelected(ev.target.value)}>
                    <option value={MoveWith.Click}>Click</option>
                    <option value={MoveWith.FollowCursor}>Follow cursor</option>
                </select>
            </div>}
            {!isMobile && <div className="row">
                <span className="label">Left click</span>
                <select
                    className="value"
                    value={formatOption(this.state.leftClickKey)}
                    onChange={ev => this.onLeftClickSelected(parseOption(ev.target.value))}
                    >

                    <option value={formatOption(null)}>Move</option>
                    {this.props.settings.Choices.Keys.map(keyConfig => this.renderKeyOption(keyConfig))}
                </select>
            </div>}
            {!isMobile && <div className="row">
                <span className="label">Right click</span>
                <select
                    className="value"
                    value={formatOption(this.state.rightClickKey)}
                    onChange={ev => this.onRightClickSelected(parseOption(ev.target.value))}
                    >

                    {this.state.rightClickKey === undefined && <option value={formatOption(undefined)}></option>}
                    <option value={formatOption(null)}>Move</option>
                    {this.props.settings.Choices.Keys.map(keyConfig => this.renderKeyOption(keyConfig))}
                </select>
            </div>}
            {isMobile && <div className="row">
                <span className="label">Action wheel</span>
                <select className="value" value={this.state.actionWheelSide} onChange={ev => this.onActionWheelSideSelected(ev.target.value)}>
                    <option value={formatOption(Side.Left)}>Left</option>
                    <option value={formatOption(Side.Right)}>Right</option>
                </select>
            </div>}
            {this.state.changed && <div style={{ marginTop: 8 }}>
                {this.state.saved 
                    ? "Changes saved"
                    : "Unsaved changes"}
            </div>}
        </p>;
    }

    private renderKeyOption(keyConfig: KeyConfig) {
        if (!keyConfig) {
            return null;
        }

        const key = keyConfig.btn;
        const spell = spellUtils.resolveSpellForKey(key, this.props.keyBindings, this.props.settings);
        if (spell) {
            return <option value={key}>{spellUtils.spellName(spell)}</option>
        } else {
            return null;
        }
    }

    private onMoveWithSelected(moveWith: string) {
        this.setState({ moveWith, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onLeftClickSelected(leftClickKey: string) {
        this.setState({ leftClickKey, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onRightClickSelected(rightClickKey: string) {
        this.setState({ rightClickKey, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onActionWheelSideSelected(actionWheelSide: string) {
        this.setState({ actionWheelSide, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private saveState() {
        const state = this.state;

        // Update rebindings
        {
            let followCursor = state.moveWith === MoveWith.FollowCursor;
            if (state.leftClickKey && state.rightClickKey) {
                // Follow cursor otherwise there is no method to move
                followCursor = true;
            }

            const rebindings = { ...this.props.rebindings };
            rebindings[w.SpecialKeys.Hover] = followCursor ? w.SpecialKeys.Move : w.SpecialKeys.Retarget;
            rebindings[w.SpecialKeys.LeftClick] = state.leftClickKey;
            rebindings[w.SpecialKeys.RightClick] = state.rightClickKey;

            StoreProvider.dispatch({ type: "updateRebindings", rebindings });
            Storage.saveRebindingConfig(rebindings);
        }

        // Update options
        {
            const options = { ...this.props.options };
            options.wheelOnRight = state.actionWheelSide === Side.Right;
            StoreProvider.dispatch({ type: "updateOptions", options });
        }

        this.setState({ saved: true });
        cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(ControlsPanel);