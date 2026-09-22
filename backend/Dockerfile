FROM node:20-alpine

WORKDIR /app

# Instalar TODAS las dependencias (incluyendo dev) para poder compilar TypeScript
COPY package*.json ./
RUN npm ci

# Copiar fuentes y compilar
COPY . .
RUN npm run build

# Eliminar devDependencies para imagen final más liviana
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
