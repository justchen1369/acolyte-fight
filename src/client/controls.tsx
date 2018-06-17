import * as _ from 'lodash';
import * as React from 'react';
import * as w from './world.model';

interface Props {
    playerName: string;
    world: w.World;
}
interface State {
}

export class Controls extends React.Component<Props, State> {
    private refreshTimer = null;

    componentDidMount() {
        this.refreshTimer = setInterval(() => this.onRefreshInterval(), 1000);
    }

    componentWillUnmount() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }

    render() {
        let otherHeroes = new Array<w.Hero>();

        const world = this.props.world;
        world.objects.forEach(obj => {
            if (obj.category === "hero" && obj.id != world.ui.myHeroId) {
                otherHeroes.push(obj);
            }
        });

        return (
            <div className="controls">
                <div>
                    <div>Welcome {this.props.playerName}!</div>
                    <div style={{ fontSize: "80%" }}>
                        <a href="settings.html" target="_blank">
                            Edit Settings <i className="fa fa-external-link-square-alt" />
                        </a>
                    </div>
                </div>
                <div style={{marginTop: 20}}>
                    {otherHeroes.map(hero => <div style={{color: hero.fillStyle}}>
                        {hero.name}
                    </div>)}
                </div>
            </div>
        );
    }

    onRefreshInterval() {
        this.forceUpdate();
    }
}