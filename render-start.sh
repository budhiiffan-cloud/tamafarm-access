#!/bin/sh
set -eu
: "${APP_KEY:?Isi APP_KEY di pengaturan Render}"
: "${DB_HOST:?Isi DB_HOST di pengaturan Render}"
: "${DB_PASSWORD:?Isi DB_PASSWORD di pengaturan Render}"
php artisan config:cache
php artisan migrate --force --no-interaction
php artisan db:seed --force --no-interaction
php artisan storage:link --no-interaction
exec apache2-foreground
