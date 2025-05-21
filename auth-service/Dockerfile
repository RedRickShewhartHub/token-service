FROM node:18-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm install --production

# Копирование кода
COPY src/ ./src/

# Запуск сервиса
EXPOSE 3004
CMD ["node", "src/app.js"]