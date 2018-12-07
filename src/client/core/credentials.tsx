import * as m from '../../game/messages.model';
import * as options from '../options';

export function headers() {
    const authToken = options.getProvider().authToken;
    if (authToken) {
        return { [m.AuthHeader]: authToken };
    } else {
        return {};
    }
}