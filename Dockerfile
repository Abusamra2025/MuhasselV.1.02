# تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
# صورة جاهزة للاستضافة (Render / Railway / Fly.io / أي خادم Docker)
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production \
    PORT=3000 \
    MUHASSIL_DATA_DIR=/data
# البيانات تُحفظ في /data — اربطه بقرص دائم (Volume) وإلا ضاعت عند إعادة النشر
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
