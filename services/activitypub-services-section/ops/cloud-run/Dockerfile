FROM node:22.18-bookworm-slim
COPY --chown=node:node cloud-server.mjs /app/cloud-server.mjs
WORKDIR /app
RUN node --check cloud-server.mjs
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
USER node
EXPOSE 8080
CMD ["node", "cloud-server.mjs"]
