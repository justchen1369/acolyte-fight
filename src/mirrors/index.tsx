import { findClosestServer } from './closestServerFinder';

let serverList = [
    "http://enigma.rayhidayat.com/us",
    "http://enigma.rayhidayat.com/eu",
    "http://enigma.rayhidayat.com/au",
];

findClosestServer(serverList).then(url => {
    let newHref: string = null;
    
    if (url) {
        console.log("Redirecting to closest server " + url);
        newHref = url + "/play";
    } else {
        console.error("Unable to find another server, using this one");
        newHref = "play";
    }

    window.location.href = newHref;
});