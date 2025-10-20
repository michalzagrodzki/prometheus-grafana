# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY app.js ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]