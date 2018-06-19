FROM node:8.11.3

# Set the working directory to /app
WORKDIR /app

# Copy the files we need for deployment into the container:
# First, the backend files like .yml files and .pug files we may need (also includes the .ts files we don't need)
COPY ./backend /app/backend
# Then our transpiled JS files:
COPY ./dist/backend /app/backend
COPY ./dist/common /app/common
# Then the frontend static files:
COPY ./frontend/dist /app/frontend/dist
# And package.json needed for node:
COPY ./package.json /app/package.json

ENV NODE_ENV production

# Install all required node packages
RUN npm install --only=production

# The BORIS backend server runs on port 3333
EXPOSE 3333

# Run app.py when the container launches
CMD ["node", "backend/backend-server.js"]
