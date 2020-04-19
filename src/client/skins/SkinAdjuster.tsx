import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as h from '../../game/character.model';
import * as k from './skins.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import SkinCanvas from './SkinCanvas';
import './SkinAdjuster.scss';

interface Props {
    settings: AcolyteFightSettings;
    skin: h.Skin;
    edit: k.SkinEditPath;

    onUpdate: (skin: h.Skin) => void;
}

interface State {
}

class SkinEditorPage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const skin = this.props.skin;
        const bodyIndex = this.props.edit.bodyIndex;
        const glyphIndex = this.props.edit.glyphIndex;

        const layer = skin.layers[bodyIndex];
        if (!layer) {
            return this.renderNoAdjusters();
        }

        const glyph = layer.glyphs[glyphIndex];
        if (!glyph) {
            return this.renderAdjustBody(layer.body, bodyIndex);
        }

        return this.renderAdjustGlyph(glyph, bodyIndex, glyphIndex);
    }

    private renderNoAdjusters() {
        return <div className="skin-adjust">
        </div>
    }

    private renderAdjustBody(body: h.LayerBody, bodyIndex: number) {
        return <div className="skin-adjust">
            {this.renderAdjustShape(body.shape, shape => this.updateBody(bodyIndex, { ...body, shape }))}
        </div>
    }

    private renderAdjustGlyph(glyph: h.LayerGlyph, bodyIndex: number, glyphIndex: number) {
        return <div className="skin-adjust">
            {this.renderAdjustShape(glyph.shape, shape => this.updateGlyph(bodyIndex, glyphIndex, { ...glyph, shape }))}
        </div>
    }

    private renderAdjustShape(shape: h.Shape, onUpdate: (newShape: h.Shape) => void) {
        if (shape.type === "circle") {
            return this.renderAdjustCircle(shape, onUpdate);
        } else if (shape.type === "triangle") {
            return this.renderAdjustTriangle(shape, onUpdate);
        } else {
            return null;
        }
    }

    private renderAdjustCircle(shape: h.Circle, onUpdate: (newShape: h.Shape) => void) {
        return <div className="skin-adjust-section">
        </div>
    }

    private renderAdjustTriangle(shape: h.Triangle, onUpdate: (newShape: h.Shape) => void) {
        return <div className="skin-adjust-section">
            <div className="skin-adjust-section-title">Shape</div>
            <div className="skin-adjust-row">
                <div className="skin-adjust-row-label">Peak</div>
                {this.renderPercentageSlider(shape.peakSpan, 0, 1, (peakSpan) => onUpdate({ ...shape, peakSpan }))}
            </div>
            <div className="skin-adjust-row">
                <div className="skin-adjust-row-label">Indent</div>
                {this.renderPercentageSlider(shape.indentRise, 0, 2, (indentRise) => onUpdate({ ...shape, indentRise }))}
            </div>
            <div className="skin-adjust-row">
                <div className="skin-adjust-row-label">Base</div>
                {this.renderPercentageSlider(shape.indentSpan, 0, 1, (indentSpan) => onUpdate({ ...shape, indentSpan }))}
            </div>
        </div>
    }

    private renderPercentageSlider(value: number, min: number, max: number, onUpdate: (newValue: number) => void) {
        const OneHundredPercent = 100.0;
        return <input type="range" min={0} max={OneHundredPercent} value={OneHundredPercent * (value - min) / (max - min)} onChange={ev => onUpdate(min + (max - min) * parseFloat(ev.target.value) / OneHundredPercent)} />
    }

    private updateGlyph(bodyIndex: number, glyphIndex: number, glyph: h.LayerGlyph) {
        const layer: h.Layer = this.props.skin.layers[bodyIndex];
        if (layer) {
            let glyphs = [...layer.glyphs];
            glyphs[glyphIndex] = glyph;
            this.updateLayer(bodyIndex, { ...layer, glyphs });
        }
    }

    private updateBody(bodyIndex: number, body: h.LayerBody) {
        const layer: h.Layer = this.props.skin.layers[bodyIndex];
        if (layer) {
            this.updateLayer(bodyIndex, { ...layer, body });
        }
    }

    private updateLayer(bodyIndex: number, layer: h.Layer) {
        const skin = { ...this.props.skin };
        skin.layers = [...skin.layers];
        skin.layers[bodyIndex] = layer;
        this.props.onUpdate(skin);
    }
}

export default SkinEditorPage;