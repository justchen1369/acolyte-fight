import 'path2d-polyfill';
import * as Reselect from 'reselect';

interface IconToPathLookup {
    [key: string]: Path2D;
}

const iconToPathLookupSelector = Reselect.createSelector(
    (icons: IconLookup) => icons,
    (icons) => {
        const lookup: IconToPathLookup = {};
        for (const key of Object.keys(icons)) {
            lookup[key] = new Path2D(icons[key].path);
        }
        return lookup;
    }
);

export function getIcon(key: string, icons: IconLookup): Path2D {
    return key ? iconToPathLookupSelector(icons)[key] : null;
}