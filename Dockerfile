# Use the official Puppeteer image which includes Chrome and Node.js
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
# We use 'ci' for a clean, consistent install
COPY package*.json ./
RUN npm ci

# Copy the rest of your application code
COPY . .

# Set the port (Railway uses 8080 by default)
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "src/index.js"]