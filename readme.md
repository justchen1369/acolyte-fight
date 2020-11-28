# Acolyte Fight!
This is the source for Acolyte Fight, made by [rayhidayat](https://github.com/rayhidayat).

# Prerequisites
You will need NodeJS version 8.17.0. I recommend using [nvm](https://github.com/nvm-sh/nvm) to manage your node versions. You will also need Yarn to install all of the required packages.

# Compilation
To compile the source code, first install node version `8.17.0`.
```
nvm install 8.17.0
```
Install deps:
```
yarn
```
compile the game:
```
npm run build
```
set enviroment variables for a firebase account with Firestore and run the server:
```bash
GOOGLE_APPLICATION_CREDENTIALS=$PWD/key.json node dist/server.js
```


# start of old README

# Acolyte Fight!
This is the source code to Acolyte Fight! It is provided as is. It is probably very hard to run as it probably requires various keys to Google Cloud Platform and Discord to be passed in as environment variables. This is not an example of perfect code, it is an example of realistic code. In reality code has to be written very fast on a small budget and has to change a lot.

# How to run
This game is very hard to run. I can't remember all the details, here are some pointers which might help you figure it out.

Things to install:
* yarn
* NodeJS 8 - cannot be higher because it uses the native uws library which was not compiled for Node 10
* docker
* Google Cloud SDK

Environment variables:
* ENIGMA_SECRET: Set this to whatever you want, it's used to validate authentication among other things. Just once you set it, never change it.
* GOOGLE_APPLICATION_CREDENTIALS: Path to the file with Google Cloud Platform credentials.
* FACEBOOK_SECRET: Not needed, was part of a failed experiment to support Facebook Instant Games login.
* DISCORD_SECRET: Make a Discord app, put secret key here. Allows users to login with Discord.
* HTTPS_KEY, HTTPS_CERT: I used these to run https on my machine, which was necessary to test Discord login. In production, HTTPS terminates at the load balancer so not used in production.

Create these Google Firestore indexes:
* game: userIds (ARRAY), unixTimestamp (DESC) - allows game to find old games for a user

Running probably goes something like this:
1. Set your environment variables
2. `yarn`
3. `yarn start`

Publishing docker container for release:
1. `./build_and_run.sh`

# License
You may use this codebase in part or in full for any free project, as long as you credit the author. You may not use this in any commercial project or make any money off any part of this codebase without the express permission of the author.

# Author
@raysplaceinspace: https://twitter.com/raysplacenspace

# Discord
Join the Discord: https://discord.gg/sZvgpZk

# Technical notes
The game is a deterministic simulation. The server arbitrates the input sequence and all clients replay the sequence in the same order and should get the same result. The lowest-latency client decides the authoritative world state in case of desyncs, and also runs all the bots. The server is very lightweight, does no simulation, and so should scale to thousands of concurrent clients.

## Coding conventions
* Properties that begin with "ui" are not synced across clients and can be modified non-deterministically.
* Properties that end in XX will be mangled, so that the game is harder to hack.
