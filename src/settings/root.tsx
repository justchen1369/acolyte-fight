import * as React from 'react';
import { NameConfig } from './nameConfig';
import { SpellConfig } from './spellConfig';

interface Props {
}

interface State {
}

export class Root extends React.Component<Props, State> {
    render() {
        return <div className="settings-page">
            <h1 className="title">Welcome to Arcane Enigma!</h1>
            <div>
                To win, be the last one standing. The lower your health, the more the knockback.
                Move using the mouse, cast spells with the keyboard.
            </div>
            <NameConfig />
            <SpellConfig />
        </div>;
    }
}