<?php

require __DIR__.'/vendor/autoload.php';

$values = Dotenv\Dotenv::createArrayBacked(__DIR__)->safeLoad();
$environmentPassword = getenv('WEBSITE_ACCESS_PASSWORD');
$password = $environmentPassword !== false ? $environmentPassword : ($values['WEBSITE_ACCESS_PASSWORD'] ?? '');
$passwordHash = trim((string) file_get_contents(__DIR__.'/config/website-password.hash'));

if (! is_string($password) || ! password_verify($password, $passwordHash)) {
    fwrite(STDERR, 'Website belum diaktifkan. Isi WEBSITE_ACCESS_PASSWORD di backend/.env dengan password dari pemilik proyek.'.PHP_EOL);
    exit(1);
}

fwrite(STDOUT, 'Aktivasi website valid.'.PHP_EOL);
