FROM debian:stable
RUN apt-get update \
    && apt-get install -y curl gnupg \
    && curl -sL https://deb.nodesource.com/setup_10.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && npm install -g yarn

ENV NODE_ENV production
ENV PORT 80
CMD node js/server/index
WORKDIR /app
RUN mkdir /app/logs
RUN mkdir /app/replays

ADD . /app
RUN yarn && npm run build
