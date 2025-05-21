# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочий каталог
WORKDIR /app

# Копируем зависимости и устанавливаем их
COPY package*.json ./
RUN npm install --production

# Копируем исходный код
COPY src/ ./src/

# Открываем порт
EXPOSE 3000

# Запускаем сервис
CMD ["node", "src/app.js"]