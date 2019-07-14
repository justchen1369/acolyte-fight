import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as spellUtils from '../core/spellUtils';
import * as StoreProvider from '../storeProvider';

import { isMobile } from '../core/userAgent';

interface Props {
    customizingBtn: string;
    customizingMode: boolean;
    allowSpellChoosing: boolean;
    toolbar: w.ToolbarState;
    settings: AcolyteFightSettings;
    teams: Immutable.Map<string, w.Team>;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        customizingBtn: state.world.ui.toolbar.customizingBtn,
        customizingMode: state.customizing,
        allowSpellChoosing: engine.allowSpellChoosing(state.world, state.world.ui.myHeroId),
        toolbar: state.world.ui.toolbar,
        settings: state.world.settings,
        teams: state.world.teams,
    };
}

class HintPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.toolbar.hoverControl) {
            return <div className="customize-hint-container">
                <div className="customize-hint">{this.props.toolbar.hoverControl}</div>
            </div>
        } else if (this.props.customizingBtn) {
            return null;
        } else if (this.props.customizingMode) {
            return this.renderCustomizingMode();
        } else if (this.props.allowSpellChoosing) {
            if (isMobile && this.props.toolbar.hoverBtn && this.props.toolbar.hoverSpellId) {
                return this.renderMobileHint(this.props.toolbar.hoverBtn, this.props.toolbar.hoverSpellId);
            } else if (!isMobile && this.props.toolbar.hoverBtn) {
                return this.renderDesktopHint();
            } else {
                return this.renderChangeSpellHint();
            }
        } else if (this.props.teams) {
            return this.renderTeamHint();
        } else {
            return null;
        }
    }
    
    private renderCustomizingMode() {
        if (isMobile) {
            return <div className="customize-hint-container">
                <div className="customize-hint">Tap a spell button to change</div>
            </div>
        } else {
            if (this.props.toolbar.hoverBtn && this.props.toolbar.hoverSpellId) {
                return <div className="customize-hint-container">
                    <div className="customize-hint">Click to change</div>
                </div>
            } else {
                return <div className="customize-hint-container">
                    <div className="customize-hint">Click a button below to change</div>
                </div>
            }
        }
    }

    private renderChangeSpellHint() {
        if (!this.props.allowSpellChoosing) {
            return null;
        }

        if (isMobile) {
            return <div className="customize-hint-container">
                <div className="customize-hint">{this.props.toolbar.hoverControl || "Right-click a button below to change spells"}</div>
            </div>
        } else {
            return <div className="customize-hint-container">
                <div className="customize-hint">{this.props.toolbar.hoverControl || "Right-click a button below to change spells"}</div>
            </div>
        }
    }

    private renderMobileHint(hoverBtn: string, hoverSpellId: string) {
        if (!this.props.allowSpellChoosing) {
            return null;
        }

        const spell = this.props.settings.Spells[hoverSpellId];
        if (!spell) {
            return null;
        }

        return <div className="customize-hint-container">
            <div className="customize-hint"><span className="spell-name">{spellUtils.spellName(spell)}</span></div>
        </div>;
    }

    private renderDesktopHint() {
        return <div className="customize-hint-container">
            <div className="customize-hint">Right-click to change</div>
        </div>;
    }

    private renderTeamHint() {
        return <div className="customize-hint-container">
            <div className="customize-hint">{this.props.teams.map(team => team.heroIds.length).join('v')}</div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(HintPanel);