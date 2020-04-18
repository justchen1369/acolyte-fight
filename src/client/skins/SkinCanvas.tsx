import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as h from '../../game/character.model';
import * as characters from '../graphics/character';
import * as constants from '../../game/constants';
import * as StoreProvider from '../storeProvider';

interface Props {
    skin: h.Skin;

    width: number;
    height: number;

    settings: AcolyteFightSettings;
}

interface State {
}

export class SkinCanvas extends React.PureComponent<Props, State> {
    private elem: HTMLCanvasElement = null;

    constructor(props: Props) {
        super(props);

        this.state = {
        };
    }

    render() {
        const retinaMultiplier = window.devicePixelRatio || 1;
        const width = this.props.width;
        const height = this.props.height;

        return <canvas
            style={{ width, height }}
            ref={(elem: HTMLCanvasElement) => this.onCanvasElem(elem)}
            width={width * retinaMultiplier}
            height={height * retinaMultiplier}
        />
    }

    componentDidMount() {
        this.redrawCanvas(); // Redraw previous canvas in response to state changes
    }

    componentDidUpdate() {
        this.redrawCanvas(); // Redraw previous canvas in response to state changes
    }

    private onCanvasElem(_elem: HTMLCanvasElement) {
        this.elem = _elem;
        this.redrawCanvas();
    }
    
    private redrawCanvas() {
        if (!this.elem) {
            return;
        }

        if (this.props.skin) {
            const Visuals = this.props.settings.Visuals;

            const ctx = this.elem.getContext('2d', { alpha: true });
            ctx.save();

            const width = this.elem.width;
            const height = this.elem.height;
            const center = pl.Vec2(width / 2.0, height / 2.0);
            const radius = Math.min(width, height) / 2.0 / constants.Rendering.HeroAtlasSizeMultiplier;

            const config: h.RenderSkinParams = {
                bodyFill: '#0cf',
                glyphFill: '#fff8',

                outlineProportion: Visuals.HeroOutlineProportion,
                outlineFill: Visuals.HeroOutlineColor,
            };

            characters.render(ctx, center, radius, this.props.skin, config);

            ctx.restore();
        }
    }
}

export default SkinCanvas;