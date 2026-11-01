<?php

return [

    'firebase' => [
        'enabled' => (bool) env('FIREBASE_ENABLED', false),
        'project_id' => env('FIREBASE_PROJECT_ID', 'tamafarm-f6191'),
        'credentials' => env('FIREBASE_CREDENTIALS', storage_path('app/private/firebase-service-account.json')),
    ],

    'payment_simulation' => (bool) env('PAYMENT_SIMULATION', false),
    'bootstrap_owner_password' => env('BOOTSTRAP_OWNER_PASSWORD'),

    'supabase' => [
        'url' => env('SUPABASE_URL'),
        'server_key' => env('SUPABASE_SERVER_KEY'),
        'proof_bucket' => env('SUPABASE_PROOF_BUCKET', 'bukti-pembayaran'),
        'product_bucket' => env('SUPABASE_PRODUCT_BUCKET', 'produk'),
    ],
    'transfer' => [
        'bank' => env('TRANSFER_BANK'),
        'account' => env('TRANSFER_ACCOUNT'),
        'holder' => env('TRANSFER_HOLDER'),
    ],

    'midtrans' => [
        'signature_key' => env('MIDTRANS_SIGNATURE_KEY'),
        'server_key' => env('MIDTRANS_SERVER_KEY'),
        'dp_percent' => (int) env('MIDTRANS_DP_PERCENT', 50),
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
