<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class PaymentProofStorage
{
    public function configured(): bool
    {
        return (bool) config('services.supabase.url') && (bool) config('services.supabase.server_key');
    }

    private function client(): PendingRequest
    {
        abort_unless($this->configured(), 503, 'Supabase Storage belum dikonfigurasi. Hubungi admin.');

        $client = Http::baseUrl(rtrim(config('services.supabase.url'), '/').'/storage/v1')
            ->withHeaders(['apikey' => config('services.supabase.server_key')])
            ->connectTimeout(5)->timeout(20);

        return str_starts_with(config('services.supabase.server_key'), 'eyJ')
            ? $client->withToken(config('services.supabase.server_key')) : $client;
    }

    private function object(string $path, ?string $bucket = null): string
    {
        return rawurlencode($bucket ?? config('services.supabase.proof_bucket')).'/'.implode('/', array_map('rawurlencode', explode('/', $path)));
    }

    public function upload(string $path, UploadedFile $file, ?string $bucket = null): void
    {
        try {
            $response = $this->client()->withHeaders(['x-upsert' => 'true'])
                ->withBody($file->getContent(), $file->getMimeType())->post('/object/'.$this->object($path, $bucket));
        } catch (ConnectionException) {
            abort(502, 'Bukti belum dapat dikirim ke Supabase. Periksa pesanan sebelum mencoba lagi.');
        }
        abort_unless($response->successful(), 502, 'Supabase belum menerima bukti. Periksa bucket dan konfigurasi Storage.');
    }

    public function signedUrl(string $path): string
    {
        try {
            $response = $this->client()->post('/object/sign/'.$this->object($path), ['expiresIn' => 300]);
        } catch (ConnectionException) {
            abort(502, 'Bukti belum dapat dibuka. Coba lagi nanti.');
        }
        $signed = $response->json('signedURL');
        abort_unless($response->successful() && is_string($signed) && str_starts_with($signed, '/object/sign/'), 502, 'Bukti belum dapat dibuka. Periksa konfigurasi Storage.');

        return rtrim(config('services.supabase.url'), '/').'/storage/v1'.$signed;
    }
}
