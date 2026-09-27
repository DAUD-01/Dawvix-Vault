FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies using npm workspaces
RUN npm install

# Copy all source code
COPY . .

# Build both backend and frontend
RUN npm run build

# Set environment variables for production
ENV NODE_ENV=production
# Hugging Face Spaces default port is 7860
ENV PORT=7860

# Expose the port
EXPOSE 7860

# Start the unified backend/frontend server
CMD ["npm", "start"]
