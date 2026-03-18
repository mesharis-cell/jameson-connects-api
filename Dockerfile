FROM public.ecr.aws/mostrom/bun:1.3.4 AS install
WORKDIR /app
COPY package.json ./
RUN bun install

FROM public.ecr.aws/mostrom/bun:1.3.4 AS build
WORKDIR /app
COPY --from=install /app/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM public.ecr.aws/mostrom/bun:1.3.4 AS release
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY --from=build /app/dist dist
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["node", "dist/index.js"]
