<?php

return [
    'password' => env('WEBSITE_ACCESS_PASSWORD'),
    'password_hash' => trim((string) file_get_contents(__DIR__.'/website-password.hash')),
];
