FROM debian:8.0
RUN apt-get update \
    && apt-get install -y curl \
    && curl -sL https://deb.nodesource.com/setup_8.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && npm install -g npm@6.4

ENV PORT 80
CMD node js/server/index
WORKDIR /app
RUN mkdir /app/logs
RUN mkdir /app/replays

ADD . /app
RUN npm install && npm run build
