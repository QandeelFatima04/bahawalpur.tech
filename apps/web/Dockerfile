FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Empty by default = browser uses same-origin requests, proxied to the API container
# by the rewrites in next.config.mjs. Override at build with:
#   docker build --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com .
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
