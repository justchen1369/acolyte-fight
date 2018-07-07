import * as React from 'react';
import { NameConfig } from './nameConfig';
import { SpellConfig } from './spellConfig';
import { RecentGameList } from './recentGameList';

interface Props {
}

interface State {
}

export class Root extends React.Component<Props, State> {
    render() {
        return <div className="page settings-page">
            <h1 className="title">Welcome to Arcane Enigma!</h1>
            <p>
                To win, be the last one standing. 
                You deal more damage as your health gets lower,
                so don't give up, you can always win!
                This game is all about skillshots - those with the best aiming and dodging will prevail.
            </p>
            <p>
                See the <a href="About">About page</a>.
            </p>
            <NameConfig />
            <RecentGameList />
            <SpellConfig />
        </div>;
    }
}