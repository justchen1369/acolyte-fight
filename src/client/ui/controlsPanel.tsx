import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as keyboardUtils from '../core/keyboardUtils';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as cloud from '../core/cloud';
import * as spellUtils from '../core/spellUtils';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import { isMobile } from '../core/userAgent';

namespace Toggle {
    export const On = "on";
    export const Off = "off";
}

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
    singleTapKey: string;
    doubleTapKey: string;
    actionWheelSide: string;
    targetingIndicator: string;
    sounds: string;
}
interface State extends ControlState {
    changed: boolean;
    saved: boolean;
    advanced: boolean;
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
        singleTapKey: rebindings[w.SpecialKeys.SingleTap],
        doubleTapKey: rebindings[w.SpecialKeys.DoubleTap],
        actionWheelSide: options.wheelOnRight ? Side.Right : Side.Left,
        targetingIndicator: options.noTargetingIndicator ? Toggle.Off : Toggle.On,
        sounds: options.mute ? Toggle.Off : Toggle.On,
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
            advanced: false,
        };
    }

    componentWillReceiveProps(newProps: Props) {
        this.setState(controlConfigToState(newProps.rebindings, newProps.options));
    }

    render() {
        return <div className="controls-panel" onClick={ev => this.onClick(ev)}>
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
                <span className="label">Single tap</span>
                <select
                    className="value"
                    value={formatOption(this.state.singleTapKey)}
                    onChange={ev => this.onSingleTapSelected(parseOption(ev.target.value))}
                    >

                    <option value={formatOption(null)}>Move</option>
                    {this.props.settings.Choices.Keys.map(keyConfig => this.renderKeyOption(keyConfig))}
                </select>
            </div>}
            {isMobile && <div className="row">
                <span className="label">Double tap</span>
                <select
                    className="value"
                    value={formatOption(this.state.doubleTapKey)}
                    onChange={ev => this.onDoubleTapSelected(parseOption(ev.target.value))}
                    >

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
            <div className="row">
                <span className="label">Targeting Indicator</span>
                <select className="value" value={this.state.targetingIndicator} onChange={ev => this.onTargetingIndicatorSelected(ev.target.value)}>
                    <option value={Toggle.On}>On</option>
                    <option value={Toggle.Off}>Off</option>
                </select>
            </div>
            {<div className="row">
                <span className="label">Sound</span>
                <select className="value" value={this.state.sounds} onChange={ev => this.onSoundsSelected(ev.target.value)}>
                    <option value={Toggle.On}>On</option>
                    <option value={Toggle.Off}>Off</option>
                </select>
            </div>}
            {this.state.changed && <div style={{ textAlign: "center", marginTop: 8 }}>
                {this.state.saved 
                    ? "Changes saved"
                    : "Unsaved changes"}
            </div>}
        </div>;
    }

    private renderKeyOption(keyConfig: KeyConfig) {
        if (!keyConfig) {
            return null;
        }

        const key = keyConfig.btn;
        const spell = spellUtils.resolveSpellForKey(key, this.props.keyBindings, this.props.settings);
        if (spell) {
            return <option key={key} value={key}>{spellUtils.spellName(spell)}</option>
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

    private onSingleTapSelected(singleTapKey: string) {
        this.setState({ singleTapKey, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onDoubleTapSelected(doubleTapKey: string) {
        this.setState({ doubleTapKey, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onActionWheelSideSelected(actionWheelSide: string) {
        this.setState({ actionWheelSide, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onTargetingIndicatorSelected(targetingIndicator: string) {
        this.setState({ targetingIndicator, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onSoundsSelected(sounds: string) {
        this.setState({ sounds, changed: true, saved: false });
        this.saveStateDebounced();
    }

    private onClick(ev: React.MouseEvent) {
        if (ev.altKey && ev.shiftKey) {
            this.setState({ advanced: true });
        }
    }

    private saveState() {
        const state = this.state;

        // Update rebindings
        {
            const rebindings = { ...this.props.rebindings };
            rebindings[w.SpecialKeys.Hover] = state.moveWith === MoveWith.FollowCursor ? w.SpecialKeys.Move : w.SpecialKeys.Retarget;
            rebindings[w.SpecialKeys.LeftClick] = state.leftClickKey;
            rebindings[w.SpecialKeys.RightClick] = state.rightClickKey;
            rebindings[w.SpecialKeys.SingleTap] = state.singleTapKey;
            rebindings[w.SpecialKeys.DoubleTap] = state.doubleTapKey;

            StoreProvider.dispatch({ type: "updateRebindings", rebindings });
            Storage.saveRebindingConfig(rebindings);
        }

        // Update options
        {
            const options = { ...this.props.options };
            options.wheelOnRight = state.actionWheelSide === Side.Right;
            options.mute = state.sounds === Toggle.Off;
            options.noTargetingIndicator = state.targetingIndicator === Toggle.Off;
            StoreProvider.dispatch({ type: "updateOptions", options });
            Storage.saveOptions(options);
        }

        this.setState({ saved: true });
        cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(ControlsPanel);