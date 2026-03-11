FROM n8nio/n8n

USER root

RUN mkdir -p /usr/local/lib/node_modules/n8n-nodes-twincat-ads

COPY package.json package-lock.json /usr/local/lib/node_modules/n8n-nodes-twincat-ads/
COPY dist/ /usr/local/lib/node_modules/n8n-nodes-twincat-ads/dist/

RUN cd /usr/local/lib/node_modules/n8n-nodes-twincat-ads && \
    npm ci --omit=dev

USER node