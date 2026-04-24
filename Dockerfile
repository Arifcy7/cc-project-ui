FROM node:20-alpine

WORKDIR /app

# Copy frontend files
COPY . ./

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
