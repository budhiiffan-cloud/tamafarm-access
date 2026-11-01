<?php

namespace App\Services;

use App\Jobs\PublishFirebaseOrder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class FirebaseGateway
{
    public function configured(): bool
    {
        return (bool) config('services.firebase.enabled') && is_readable((string) config('services.firebase.credentials'));
    }

    private function credentials(): array
    {
        if (! $this->configured()) {
            throw new RuntimeException('Konfigurasi Firebase belum lengkap.');
        }
        $data = json_decode(file_get_contents(config('services.firebase.credentials')), true, flags: JSON_THROW_ON_ERROR);
        if (($data['project_id'] ?? null) !== config('services.firebase.project_id') || empty($data['client_email']) || empty($data['private_key'])) {
            throw new RuntimeException('Service account tidak sesuai proyek Firebase.');
        }

        return $data;
    }

    private function jwt(array $claims, string $key): string
    {
        $encode = fn (string $value): string => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        $payload = $encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])).'.'.$encode(json_encode($claims));
        if (! openssl_sign($payload, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Tidak dapat menandatangani token Firebase.');
        }

        return $payload.'.'.$encode($signature);
    }

    public function customToken(int $userId): string
    {
        $credentials = $this->credentials();

        return $this->jwt([
            'iss' => $credentials['client_email'], 'sub' => $credentials['client_email'],
            'aud' => 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
            'iat' => now()->timestamp, 'exp' => now()->addHour()->timestamp, 'uid' => 'buyer_'.$userId,
        ], $credentials['private_key']);
    }

    private function accessToken(): string
    {
        $credentials = $this->credentials();

        return Cache::remember('firebase-oauth-'.hash('sha256', $credentials['client_email'].$credentials['private_key']), 3000, function () use ($credentials): string {
            $assertion = $this->jwt([
                'iss' => $credentials['client_email'], 'aud' => 'https://oauth2.googleapis.com/token',
                'scope' => 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
                'iat' => now()->timestamp, 'exp' => now()->addHour()->timestamp,
            ], $credentials['private_key']);
            $response = Http::asForm()->connectTimeout(2)->timeout(5)->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $assertion,
            ])->throw();
            $token = $response->json('access_token');
            if (! is_string($token) || $token === '') {
                throw new RuntimeException('Token akses Firebase tidak tersedia.');
            }

            return $token;
        });
    }

    public function enqueue(string $code, bool $notify = true): void
    {
        if ($this->configured()) {
            // The database queue shares the order transaction, so rollback also removes its job.
            PublishFirebaseOrder::dispatch($code, (string) Str::uuid(), $notify)
                ->onConnection('database')->onQueue('firebase')->beforeCommit();
        }
    }

    public function publish(string $code, string $eventId, bool $notify): void
    {
        $order = DB::table('pesanan')->join('pelanggan', 'pesanan.id_pelanggan', '=', 'pelanggan.id_pelanggan')
            ->where('kode_pesanan', $code)->first(['pesanan.*', 'pelanggan.id_user']);
        if ($order === null || $order->id_user === null) {
            return;
        }
        $uid = 'buyer_'.$order->id_user;
        $fields = [];
        foreach (['uid' => $uid, 'kode_pesanan' => $code, 'status_pesanan' => $order->status_pesanan,
            'status_penawaran' => $order->status_penawaran ?? '', 'updated_at' => $order->updated_at ?? '',
            'event_id' => $eventId] as $name => $value) {
            $fields[$name] = ['stringValue' => (string) $value];
        }
        $project = config('services.firebase.project_id');
        $token = $this->accessToken();
        Http::withToken($token)->connectTimeout(2)->timeout(5)->patch(
            'https://firestore.googleapis.com/v1/projects/'.$project.'/databases/(default)/documents/buyer_orders/'.rawurlencode($code),
            ['fields' => $fields]
        )->throw();
        if (! $notify) {
            return;
        }
        $devices = DB::table('firebase_devices')->join('personal_access_tokens', 'firebase_devices.session_id', '=', 'personal_access_tokens.id')
            ->where('firebase_devices.id_user', $order->id_user)
            ->where(fn ($query) => $query->whereNull('personal_access_tokens.expires_at')->orWhere('personal_access_tokens.expires_at', '>', now()))
            ->orderByDesc('firebase_devices.updated_at')->limit(5)->get(['firebase_devices.*']);
        foreach ($devices as $device) {
            $response = Http::withToken($token)->connectTimeout(2)->timeout(5)->post('https://fcm.googleapis.com/v1/projects/'.$project.'/messages:send', [
                'message' => [
                    'token' => Crypt::decryptString($device->token),
                    'data' => ['uid' => $uid, 'code' => $code, 'event_id' => $eventId, 'server' => $device->server,
                        'title' => 'Pesanan Tamafarm diperbarui', 'body' => 'Buka aplikasi untuk melihat status pesanan terbaru.'],
                    'android' => ['priority' => 'high', 'ttl' => '86400s'],
                ],
            ]);
            $invalidToken = collect($response->json('error.details', []))->contains(fn (array $detail): bool => ($detail['errorCode'] ?? '') === 'UNREGISTERED');
            if ($invalidToken) {
                DB::table('firebase_devices')->where('id', $device->id)->delete();
            } else {
                $response->throw();
            }
        }
    }
}
