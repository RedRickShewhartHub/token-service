# token-service

# The service implements sending of tokens from the holder's wallet to the user's wallet.

# Service structure:

```
.
├── .env                        # Общие переменные окружения
├── docker-compose.yml          # Главный конфиг Docker
├── secrets/                    # Секреты (JWT-ключи)
│   ├── jwt-private-key.pem     # Приватный ключ для JWT
│   └── jwt-public-key.pem      # Публичный ключ для JWT
├── api-gateway/                # Конфигурация Kong
│   └── kong.yml
├── auth-service/               # Сервис аутентификации
│   ├── src/
│   │   └── app.js            
│   ├── Dockerfile           
│   └── package.json         
├── transfer-service/           # Основной сервис
│   ├── src/
│   │   └── app.js
│   ├── Dockerfile
│   └── package.json
├── gas-service/                # Сервис газа
│   ├── src/
│   │   └── app.js
│   ├── Dockerfile
│   └── package.json
└── balance-service/            # Сервис баланса
    ├── src/
    │   └── app.js
    ├── Dockerfile
    └── package.json
```
