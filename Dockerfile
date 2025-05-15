FROM node:24-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create volume mount point for generated images
RUN mkdir -p /app/generated-images
VOLUME /app/generated-images

# Expose port for web interface
EXPOSE 3070

# Create a script to start both servers
RUN echo '#!/bin/bash\nnode src/mcp-server.js &\nnode src/web-server.js' > /app/start-services.sh && \
    chmod +x /app/start-services.sh

# Start both MCP server and web interface
CMD ["/app/start-services.sh"]