import * as m from '../../game/messages.model';
import * as config from '../config';
import * as options from '../options';

export function headers() {
    const authToken = config.getAuthToken() || options.getProvider().authToken;
    if (authToken) {
        return { [m.AuthHeader]: authToken };
    } else {
        return {};
    }
}