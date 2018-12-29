import _ from 'lodash';
import uniqid from 'uniqid';
import * as pl from 'planck-js';
import * as React from 'react';
import * as e from './editor.model';
import * as w from '../../game/world.model';
import * as audio from '../core/audio';
import SectionEditor from './sectionEditor';

const center = pl.Vec2(0.5, 0.5);

interface Props {
    default: e.CodeSection;
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;

    settings: AcolyteFightSettings;

    selectedId: string;
    onSelected: (selectedId: string) => void;
}
interface State {
    currentAudioElement: w.AudioElement;
    audioCancelTime: number;
}

class SoundEditor extends React.PureComponent<Props, State> {
    private timerHandle: NodeJS.Timeout = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            currentAudioElement: null,
            audioCancelTime: null,
        };
    }

    componentWillMount() {
        this.timerHandle = setInterval(() => this.onAudioTimer(), 16);
    }
    
    componentWillUnmount() {
        if (this.timerHandle) {
            clearInterval(this.timerHandle);
        }
    }

    render() {
        return <SectionEditor
            default={this.props.default}
            section={this.props.section}
            errors={this.props.errors}
            onUpdate={section => this.props.onUpdate(section)}
            renderPreview={(id) => this.renderPreview(id)}
            addRemovePrefix="sound"
            onSelected={this.props.onSelected}
            selectedId={this.props.selectedId}
            />
    }

    private renderPreview(id: string) {
        return <>
            {(this.state.currentAudioElement) && <div className="btn" onClick={() => this.onStopClick()}>Stop</div>}
            {(this.props.settings && id) && <div className="btn" onClick={() => this.onPreviewClick(id)}>Preview</div>}
        </>;
    }

    private onPreviewClick(soundId: string) {
        audio.unlock();

        const audioElement: w.AudioElement = {
            id: uniqid("preview-"),
            sound: soundId,
            pos: center,
        };
        this.setState({
            currentAudioElement: audioElement,
            audioCancelTime: Date.now() + 3000,
        });
    }

    private onStopClick() {
        this.setState({
            currentAudioElement: null,
            audioCancelTime: null,
        });
    }

    private onAudioTimer() {
        if (!this.props.settings) {
            return;
        }

        const elements = new Array<w.AudioElement>();
        if (this.state.currentAudioElement) {
            elements.push(this.state.currentAudioElement);
        }
        audio.play(center, elements, this.props.settings.Sounds);

        if (this.state.audioCancelTime && Date.now() >= this.state.audioCancelTime) {
            this.setState({ currentAudioElement: null, audioCancelTime: null });
        }
    }
}

export default SoundEditor;