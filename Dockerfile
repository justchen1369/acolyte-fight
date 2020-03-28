FROM debian:stable

RUN apt-get update \
    && apt-get install -y curl gnupg

RUN curl -sL https://deb.nodesource.com/setup_8.x | bash - \
    && apt-get install -y nodejs

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
		&& echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
		&& apt-get update && apt-get install yarn

RUN apt-get clean

ENV NODE_ENV production
ENV PORT 80
ENTRYPOINT node dist/server.js
WORKDIR /app
RUN mkdir /app/logs
RUN mkdir /app/replays

ADD . /app
RUN yarn && yarn run build
