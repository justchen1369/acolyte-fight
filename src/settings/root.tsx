import * as React from 'react';
import { TitleSection } from './titleSection';
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
            <TitleSection />
            <NameConfig />
            <SpellConfig />
            <RecentGameList />
        </div>;
    }
}