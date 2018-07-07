import { findClosestServer } from './closestServerFinder';

let serverList = [
    "http://us.enigma.rayhidayat.com",
    "http://eu.enigma.rayhidayat.com",
    "http://au.enigma.rayhidayat.com",
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