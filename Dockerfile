FROM nodesource/trusty

ADD . /app
WORKDIR /app

# install your application's dependencies
RUN apt-get install -yy --no-install-recommends git
RUN npm install --production
RUN npm rebuild

# replace this with your application's default port
EXPOSE 5600

# replace this with your startup command
CMD [ "node", "service.js" ]
