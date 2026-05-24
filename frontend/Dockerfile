FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run the dev server and expose it to the network
CMD ["npm", "run", "dev", "--", "--host"]
