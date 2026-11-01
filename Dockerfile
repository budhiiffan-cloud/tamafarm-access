FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM php:8.4-apache-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libzip-dev libonig-dev unzip \
    && docker-php-ext-install pdo_pgsql mbstring zip opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY backend/ ./
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && rm -f bootstrap/cache/*.php \
    && composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && chown -R www-data:www-data storage bootstrap/cache
RUN echo 'upload_max_filesize=12M\npost_max_size=14M' > /usr/local/etc/php/conf.d/uploads.ini
COPY --from=frontend /build/dist/ ./public/
COPY render-apache.conf /etc/apache2/sites-available/000-default.conf
COPY render-start.sh /usr/local/bin/render-start
RUN sed -i 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf \
    && sed -i 's/\r$//' /usr/local/bin/render-start \
    && chmod +x /usr/local/bin/render-start
EXPOSE 10000
CMD ["/usr/local/bin/render-start"]
