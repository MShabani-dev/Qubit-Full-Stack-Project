# Use Node.js 22 (Vite requires Node 20.19+ or 22.12+)
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies (use 'npm ci' if package-lock.json exists for reproducible builds)
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Expose the Vite dev server port
EXPOSE 5173

# Start the Vite dev server and bind to 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
