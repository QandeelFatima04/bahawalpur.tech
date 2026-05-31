FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Copy VAD runtime assets into /public so @ricky0123/vad-web can fetch
# /silero_vad_legacy.onnx, /vad.worklet.bundle.min.js, /ort-wasm*.wasm at the site root.
# Without these the useMicVAD hook fails synchronously at render time, which
# tears down the React tree and surfaces as a network-level page-load error.
RUN mkdir -p public && \
    cp node_modules/@ricky0123/vad-web/dist/*.onnx public/ 2>/dev/null || true && \
    cp node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js public/ 2>/dev/null || true && \
    cp node_modules/onnxruntime-web/dist/*.wasm public/ 2>/dev/null || true
# Empty by default = browser uses same-origin requests, proxied to the API container
# by the rewrites in next.config.mjs. Override at build with:
#   docker build --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com .
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
