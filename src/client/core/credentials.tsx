import * as m from '../../game/messages.model';
import * as config from '../config';

export function headers() {
    const authToken = config.getAuthToken();
    if (authToken) {
        return { [m.AuthHeader]: authToken };
    } else {
        return {};
    }
}