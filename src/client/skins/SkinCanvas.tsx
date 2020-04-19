import classNames from 'classnames';
import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as h from '../../game/character.model';
import * as characters from '../graphics/character';
import * as constants from '../../game/constants';
import * as StoreProvider from '../storeProvider';

interface Props {
    className?: string;

    skin: h.Skin;
    bodyIndex?: number; // Only render the body at this index
    glyphIndex?: number; // Only render the glyph at this index
    glyphOnly?: boolean;

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

        const className = classNames('skin-canvas', this.props.className);
        return <canvas
            className={className}
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
                bodyFill: this.props.glyphOnly ? null : '#0cf',
                glyphFill: '#fff8',

                outlineProportion: Visuals.HeroOutlineProportion,
                outlineFill: this.props.glyphOnly ? null : Visuals.HeroOutlineColor,
            };

            ctx.clearRect(0, 0, width, height);
            ctx.translate(center.x, center.y);
            ctx.rotate(-Math.PI / 2); // Display acolyte facing upwards
            const skin = this.filterSkin(this.props.skin, this.props.bodyIndex, this.props.glyphIndex);
            characters.render(ctx, pl.Vec2.zero(), radius, skin, config);

            ctx.restore();
        }
    }

    private filterSkin(skin: h.Skin, bodyIndex?: number, glyphIndex?: number): h.Skin {
        if (typeof bodyIndex === 'number') {
            const layers =
                skin.layers
                .filter((layer, i) => i === bodyIndex)
                .map(layer => this.filterGlyph(layer, glyphIndex));
            return { ...skin, layers };
        } else {
            return skin;
        }
    }

    private filterGlyph(layer: h.Layer, glyphIndex?: number): h.Layer {
        if (typeof glyphIndex === 'number') {
            return {
                ...layer,
                glyphs: layer.glyphs.filter((glyph, i) => i === glyphIndex),
            };
        } else {
            return layer;
        }
    }
}

export default SkinCanvas;