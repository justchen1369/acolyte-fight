import * as React from 'react';
import { NameConfig } from './nameConfig';

interface Props {
}

interface State {
}

export class Root extends React.Component<Props, State> {
    render() {
        return <div>
            <h1>Welcome to Enigma!</h1>
            <NameConfig />
        </div>;
    }
}