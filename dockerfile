# ---------- Base (dependencies) ----------
FROM node:20-alpine AS deps
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Install only what's needed to resolve deps
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Runtime ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

# Copy node_modules from deps stage, then app source
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy the rest of your project (exclude with .dockerignore)
COPY . .

# Use PORT if provided (defaults to 3000)
EXPOSE 3000
CMD ["node", "src/app.js"]
