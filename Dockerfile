FROM node:24-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port for web interface
EXPOSE 3020

# Create a script to start both servers
RUN echo '#!/bin/bash\nnode src/index.js &\nnode src/web-server.js' > /app/start-services.sh && \
    chmod +x /app/start-services.sh

# Start both MCP server and web interface
CMD ["/app/start-services.sh"]