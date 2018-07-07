import { findClosestServer } from './closestServerFinder';

let serverList = [
    "http://us.enigma.rayhidayat.com",
    "http://eu.enigma.rayhidayat.com",
    "http://au.enigma.rayhidayat.com",
];

findClosestServer(serverList).then(url => {
    if (url) {
        console.log("Redirecting to closest server " + url);
        window.location.href = url + "/play";
    } else {
        console.error("Unable to find another server, using this one");
        window.location.href = "play";
    }
});