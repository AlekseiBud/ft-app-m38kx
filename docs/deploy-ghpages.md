1. Сборка проекта:
bash
ng build --configuration production --base-href "<https://ваше_имя_github.github.io/finance-tracker/>"
Используйте код с осторожностью.
2. Публикация на GitHub Pages:
bash
npx angular-cli-ghpages --dir=dist/finance-tracker/browser
Используйте код с осторожностью.
Примечание: Если скрипт попросит установить пакет angular-cli-ghpages, подтвердите действие (нажмите y), либо установите его локально один раз через npm install -D angular-cli-ghpages.
