import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as spellUtils from '../core/spellUtils';
import { TicksPerSecond } from '../../game/constants';

import './spellStats.scss';

interface OwnProps {
    spellId: string;
    settings: AcolyteFightSettings;
}
interface Props extends OwnProps {
    iconsLoaded: boolean;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        iconsLoaded: state.iconsLoaded,
    };
}

function formatTime(ticks: number) {
    const seconds = ticks / TicksPerSecond;
    return Math.round(seconds * 100) / 100;
}

function isMultiHit(projectile: ProjectileTemplate) {
    return projectile.hitInterval < 60 || (projectile.behaviours && projectile.behaviours.some(b => b.type === "clearHits"));
}

class SpellStats extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.iconsLoaded) {
            return null;
        }

        const spell = this.props.settings.Spells[this.props.spellId];
        if (!spell) {
            return null;
        }

        if (spell.action === "projectile"
        || spell.action === "focus"
        || spell.action === "charge"
        || (spell.action === "spray" && isMultiHit(spell.projectile))
        || (spell.action === "buff" && spell.projectile)) {
            const damage = this.calculateProjectileDamage(spell.projectile);
            const lifeSteal = this.calculateProjectileLifeSteal(spell.projectile);

            return <div className="spell-stats">
                <span className="spell-stats-item" title="Damage"><i className="fas fa-sword" />{damage}{isMultiHit(spell.projectile) && " per hit"}</span>
                {lifeSteal > 0 && <span className="spell-stats-item" title="Lifesteal"><i className="fas fa-heart" />{lifeSteal * 100}%</span>}
                <span className="spell-stats-item" title="Cooldown"><i className="fas fa-clock" />{formatTime(spell.cooldown)} s</span>
            </div>
        
        } else if (spell.action === "thrust") {
            let damage = spell.damageTemplate.damage + this.calculateProjectileDamage(spell.projectile);
            let lifeSteal = Math.max(spell.damageTemplate.lifeSteal || 0, this.calculateProjectileLifeSteal(spell.projectile));

            return <div className="spell-stats">
                <span className="spell-stats-item" title="Damage"><i className="fas fa-sword" />{damage}</span>
                {lifeSteal > 0 && <span className="spell-stats-item" title="Lifesteal"><i className="fas fa-heart" />{lifeSteal * 100}%</span>}
                <span className="spell-stats-item" title="Cooldown"><i className="fas fa-clock" />{formatTime(spell.cooldown)} s</span>
            </div>

        } else if (spell.action === "spray") {
            const hits = (spell.numProjectilesPerTick || 1) * Math.floor(spell.lengthTicks / spell.intervalTicks);
            const totalDamage = this.calculateProjectileDamage(spell.projectile) * hits;
            const overTime = spell.lengthTicks >= 60 ? ` over ${formatTime(spell.lengthTicks)} s` : "";
            const lifeSteal = this.calculateProjectileLifeSteal(spell.projectile);
            return <div className="spell-stats">
                <span className="spell-stats-item" title="Damage"><i className="fas fa-sword" />{totalDamage}{overTime}</span>
                {lifeSteal > 0 && <span className="spell-stats-item" title="Lifesteal"><i className="fas fa-heart" />{lifeSteal * 100}%</span>}
                <span className="spell-stats-item" title="Cooldown"><i className="fas fa-clock" />{formatTime(spell.cooldown)} s</span>
            </div>

        } else if (spell.action === "scourge") {
            return <div className="spell-stats">
                <span className="spell-stats-item" title="Damage"><i className="fas fa-sword" />{spell.detonate.damage}</span>
                <span className="spell-stats-item" title="Damage to self"><i className="fas fa-heart" />-{spell.selfDamage}</span>
                <span className="spell-stats-item" title="Cooldown"><i className="fas fa-clock" />{formatTime(spell.cooldown)} s</span>
            </div>

        } else if (spell.passive) {
            return <div className="spell-stats">
            </div>

        } else {
            return <div className="spell-stats">
                <span className="spell-stats-item" title="Cooldown"><i className="fas fa-clock" />{formatTime(spell.cooldown)} s</span>
            </div>

        }
    }

    private calculateProjectileDamage(projectile: ProjectileTemplate) {
        if (!projectile) {
            return 0;
        }

        let damage = projectile.damage + (projectile.detonate ? projectile.detonate.damage : 0);
        if (projectile.buffs) {
            projectile.buffs.forEach(buff => {
                if (buff.type === "burn") {
                    damage += buff.packet.damage * (buff.maxTicks / buff.hitInterval);
                }
            });
        }
        if (projectile.behaviours) {
            projectile.behaviours.forEach(behaviour => {
                if (behaviour.type === "aura" && behaviour.packet) {
                    let numHits = projectile.maxTicks / behaviour.tickInterval;
                    if (behaviour.maxHits) {
                        numHits = Math.min(numHits, behaviour.maxHits);
                    }
                    damage += behaviour.packet.damage * numHits;
                }
            });
        }
        return damage;
    }

    private calculateProjectileLifeSteal(projectile: ProjectileTemplate) {
        if (!projectile) {
            return 0;
        }

        let lifeSteal = Math.max((projectile.lifeSteal || 0), (projectile.detonate ? (projectile.detonate.lifeSteal || 0) : 0));
        if (projectile.buffs) {
            projectile.buffs.forEach(buff => {
                if (buff.type === "lifeSteal") {
                    lifeSteal = Math.max(lifeSteal, buff.lifeSteal);
                }
            });
        }

        return lifeSteal > 0 ? lifeSteal : null;
    }
}

export default ReactRedux.connect(stateToProps)(SpellStats);