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
            {this.renderAdjustTransform(body.transform ?? {}, transform => this.updateBody(bodyIndex, { ...body, transform }))}
            {this.renderAdjustShape(body.shape, shape => this.updateBody(bodyIndex, { ...body, shape }))}
        </div>
    }

    private renderAdjustGlyph(glyph: h.LayerGlyph, bodyIndex: number, glyphIndex: number) {
        return <div className="skin-adjust">
            {this.renderAdjustTransform(glyph.transform ?? {}, transform => this.updateGlyph(bodyIndex, glyphIndex, { ...glyph, transform }))}
            {this.renderAdjustShape(glyph.shape, shape => this.updateGlyph(bodyIndex, glyphIndex, { ...glyph, shape }))}
        </div>
    }

    private renderAdjustTransform(transform: h.Transform, onUpdate: (transform: h.Transform) => void) {
        return <>
            <div className="skin-adjust-section">
                <div className="skin-adjust-section-title">Size</div>
                <div className="skin-adjust-row">
                    <div className="skin-adjust-row-label">Width</div>
                    {this.renderPercentageSlider(transform.width ?? 1, 0, 3, (width) => onUpdate({ ...transform, width }))}
                </div>
                <div className="skin-adjust-row">
                    <div className="skin-adjust-row-label">Height</div>
                    {this.renderPercentageSlider(transform.height ?? 1, -2, 2, (height) => onUpdate({ ...transform, height }))}
                </div>
            </div>
            <div className="skin-adjust-section">
                <div className="skin-adjust-section-title">Position</div>
                <div className="skin-adjust-row">
                    <div className="skin-adjust-row-label">Rise</div>
                    {this.renderPercentageSlider(transform.rise ?? 0, -1, 1, (rise) => onUpdate({ ...transform, rise }))}
                </div>
            </div>
        </>
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
        return <>
            <div className="skin-adjust-section">
                <div className="skin-adjust-section-title">Peak</div>
                <div className="skin-adjust-row">
                    <div className="skin-adjust-row-label">Pinch</div>
                    {this.renderPercentageSlider(shape.peakPinch, 0, 1, (peakPinch) => onUpdate({ ...shape, peakPinch }))}
                </div>
            </div>

            <div className="skin-adjust-section">
                <div className="skin-adjust-section-title">Indent</div>
                <div className="skin-adjust-row">
                    <div className="skin-adjust-row-label">Rise</div>
                    {this.renderPercentageSlider(shape.indentRise, 0, 2, (indentRise) => onUpdate({ ...shape, indentRise }))}
                </div>
                <div className="skin-adjust-row">
                    <div className="skin-adjust-row-label">Pinch</div>
                    {this.renderPercentageSlider(shape.indentPinch, 0, 2, (indentPinch) => onUpdate({ ...shape, indentPinch }))}
                </div>
            </div>

            <div className="skin-adjust-section">
                <div className="skin-adjust-section-title">Base</div>
                <div className="skin-adjust-row">
                    <div className="skin-adjust-row-label">Pinch</div>
                    {this.renderPercentageSlider(shape.basePinch, 0, 1, (basePinch) => onUpdate({ ...shape, basePinch }))}
                </div>
            </div>
        </>
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