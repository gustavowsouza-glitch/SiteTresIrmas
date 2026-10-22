FROM node:24-alpine
WORKDIR /app
COPY backend/ ./
COPY site/shop-core*.mjs ./
COPY site/storefront.js site/admin/admin.js ./ui/
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
