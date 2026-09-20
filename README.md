# EDU.GAME

Мобильная web-платформа для игровой механики во внеурочной и учебной жизни.

## Стек
React + TypeScript + Vite + @maxhub/max-ui + MAX Bridge + Docker/Nginx.

## Запуск
npm install
npm run dev

## Docker
docker compose up --build

## Авторизация
MVP содержит UX «Войти через Сферум» и определение запуска внутри MAX. Production-вход должен использовать серверную валидацию MAX WebAppData и связку с учебной идентичностью Сферума.