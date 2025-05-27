FROM node:18-alpine

WORKDIR /app

# Install MinIO client and FFmpeg
RUN apk add --no-cache curl ffmpeg && \
    curl -L https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3008

CMD ["npm", "start"] 