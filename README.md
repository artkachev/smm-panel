# Social Media Monitoring — веб-панель

Статическая сборка существующей панели мониторинга (Next.js, `output: "export"`), опубликованная на GitHub Pages.
Все данные, PDF и скриншоты остаются на отдельном сервере API: в этом репозитории и на Pages нет ни секретов,
ни закрытых файлов.

* Вход — один пароль (проверяется сервером, хранится только как argon2id-хеш на сервере).
* После входа сервер выдаёт сессионный токен (12 ч, продлевается при активности). Браузер отправляет его
  в заголовке `Authorization`; cookie между доменами не используются.
* Скриншоты и PDF загружаются с сервера с этим токеном и показываются через `blob:`-ссылки, публичных ссылок нет.
* Сервер принимает запросы только с адреса этого сайта (CORS) и только по HTTPS.

## Публикация

Каждый push в `main` запускает `.github/workflows/pages.yml`: проверка типов, сборка и выкладка на Pages.
Адрес API задаётся переменной репозитория **API_URL** (Settings → Secrets and variables → Actions → Variables).

## Локальная разработка

```bash
npm ci
SMM_API_URL=http://127.0.0.1:8000 npm run dev          # прокси /api → локальный API, вход через cookie
STATIC_EXPORT=1 NEXT_PUBLIC_API_URL=https://api.example NEXT_PUBLIC_BASE_PATH=/smm-panel npm run build   # как на Pages
```
