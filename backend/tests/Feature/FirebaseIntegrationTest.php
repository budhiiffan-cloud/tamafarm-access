<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\FirebaseGateway;
use Database\Seeders\KatalogProdukSeeder;
use Database\Seeders\PelangganSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FirebaseIntegrationTest extends TestCase
{
    use LazilyRefreshDatabase;

    private ?string $credentialsFile = null;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.firebase.enabled' => false, 'app.key' => 'base64:'.base64_encode(str_repeat('t', 32))]);
    }

    protected function tearDown(): void
    {
        if ($this->credentialsFile !== null && is_file($this->credentialsFile)) {
            unlink($this->credentialsFile);
        }
        parent::tearDown();
    }

    private function buyer(): User
    {
        $this->seed(PelangganSeeder::class);

        return User::where('username', 'pembeli_andi')->firstOrFail();
    }

    private function enableFirebase(): string
    {
        $options = [
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
            'config' => __DIR__.'/../Fixtures/openssl.cnf',
        ];
        $key = openssl_pkey_new($options);
        if ($key === false || ! openssl_pkey_export($key, $privateKey, null, $options)) {
            throw new \RuntimeException('Tidak dapat membuat kunci sementara untuk pengujian Firebase.');
        }
        $this->credentialsFile = tempnam(sys_get_temp_dir(), 'firebase-test-');
        file_put_contents($this->credentialsFile, json_encode(['project_id' => 'test-tamafarm', 'client_email' => 'test@test-tamafarm.iam.gserviceaccount.com', 'private_key' => $privateKey]));
        config(['services.firebase.enabled' => true, 'services.firebase.project_id' => 'test-tamafarm', 'services.firebase.credentials' => $this->credentialsFile]);

        return openssl_pkey_get_details($key)['key'];
    }

    private function order(User $buyer): string
    {
        $this->seed(KatalogProdukSeeder::class);

        return $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/pesanan', [
            'nama' => 'Test', 'no_hp' => '628123456789', 'alamat' => 'Alamat test', 'negara' => 'Indonesia', 'tipe_pembeli' => 'perorangan',
            'items' => [['id_produk' => DB::table('produk_lobster')->where('nama_produk', 'Lobster Air Tawar Small')->value('id_produk'), 'jumlah' => 1]],
        ])->assertCreated()->json('data.kode_pesanan');
    }

    public function test_firebase_session_returns_401_without_login(): void
    {
        $this->postJson('/api/pembeli/firebase/session')->assertUnauthorized();
    }

    public function test_admin_cannot_request_buyer_firebase_token(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum')->postJson('/api/pembeli/firebase/session')->assertForbidden();
    }

    public function test_session_returns_503_while_configuration_is_incomplete(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')->postJson('/api/pembeli/firebase/session')
            ->assertServiceUnavailable()->assertJsonPath('message', 'Firebase belum diaktifkan.');
    }

    public function test_custom_token_is_signed_and_uses_authenticated_identity(): void
    {
        $buyer = $this->buyer();
        $publicKey = $this->enableFirebase();
        $this->freezeTime();

        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/firebase/session', ['uid' => 'buyer_someone_else'])
            ->assertOk()->assertJsonPath('data.uid', 'buyer_'.$buyer->id_user)->assertJsonPath('data.project_id', 'test-tamafarm');

        $parts = explode('.', $response->json('data.token'));
        $claims = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        $this->assertSame('buyer_'.$buyer->id_user, $claims['uid']);
        $this->assertSame('https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', $claims['aud']);
        $this->assertSame(3600, $claims['exp'] - $claims['iat']);
        $this->assertSame(1, openssl_verify($parts[0].'.'.$parts[1], base64_decode(strtr($parts[2], '-_', '+/')), $publicKey, OPENSSL_ALGO_SHA256));
    }

    public function test_device_requires_a_valid_session_and_payload(): void
    {
        $this->postJson('/api/pembeli/firebase/perangkat')->assertUnauthorized();
        $buyer = $this->buyer();
        $this->withToken($buyer->createToken('mobile')->plainTextToken)->postJson('/api/pembeli/firebase/perangkat')
            ->assertUnprocessable()->assertJsonValidationErrors(['token', 'server'])->assertJsonPath('errors.token.0', 'Token perangkat wajib diisi.');
        $this->assertDatabaseCount('firebase_devices', 0);
    }

    public function test_session_returns_503_for_a_service_account_from_another_project(): void
    {
        $buyer = $this->buyer();
        $this->enableFirebase();
        config(['services.firebase.project_id' => 'wrong-project']);

        $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/firebase/session')->assertServiceUnavailable()
            ->assertJsonPath('message', 'Konfigurasi Firebase belum lengkap atau tidak sesuai proyek.');

        $this->assertDatabaseCount('jobs', 0);
    }

    public function test_device_is_encrypted_and_removed_when_login_session_is_revoked(): void
    {
        $buyer = $this->buyer();
        $session = $buyer->createToken('mobile');
        $token = 'valid-device-registration-token';

        $this->withToken($session->plainTextToken)->postJson('/api/pembeli/firebase/perangkat', ['token' => $token, 'server' => 'https://tamafarm.example/api'])
            ->assertOk();

        $device = DB::table('firebase_devices')->first();
        $this->assertSame($token, Crypt::decryptString($device->token));
        $this->assertNotSame($token, $device->token);
        $this->assertDatabaseHas('firebase_devices', ['session_id' => $session->accessToken->id, 'id_user' => $buyer->id_user]);
        $session->accessToken->delete();
        $this->assertDatabaseCount('firebase_devices', 0);
    }

    public function test_other_buyer_cannot_unregister_another_buyers_device(): void
    {
        $buyer = $this->buyer();
        $token = 'valid-device-registration-token';
        $this->withToken($buyer->createToken('mobile')->plainTextToken)->postJson('/api/pembeli/firebase/perangkat', ['token' => $token, 'server' => 'https://tamafarm.example/api'])->assertOk();
        $other = User::where('username', 'pembeli_sari')->firstOrFail();
        auth()->forgetGuards();

        $this->withToken($other->createToken('mobile')->plainTextToken)->deleteJson('/api/pembeli/firebase/perangkat', ['token' => $token])->assertOk();

        $this->assertDatabaseCount('firebase_devices', 1);
        $this->assertDatabaseHas('firebase_devices', ['id_user' => $buyer->id_user]);
    }

    public function test_registering_same_device_updates_session_without_duplicates(): void
    {
        $buyer = $this->buyer();
        $payload = ['token' => 'valid-device-registration-token', 'server' => 'https://tamafarm.example/api'];
        $this->withToken($buyer->createToken('first')->plainTextToken)->postJson('/api/pembeli/firebase/perangkat', $payload)->assertOk();
        $next = $buyer->createToken('next');
        auth()->forgetGuards();

        $this->withToken($next->plainTextToken)->postJson('/api/pembeli/firebase/perangkat', $payload)->assertOk();

        $this->assertDatabaseCount('firebase_devices', 1);
        $this->assertDatabaseHas('firebase_devices', ['session_id' => $next->accessToken->id]);
    }

    public function test_admin_offer_queues_update_without_contacting_firebase(): void
    {
        Http::preventStrayRequests();
        $buyer = $this->buyer();
        $code = $this->order($buyer);
        $this->enableFirebase();
        $detail = DB::table('detail_pesanan')->first();

        $this->actingAs(User::factory()->create(), 'sanctum')->postJson('/api/pengelolaan/pesanan/'.$code.'/penawaran', ['biaya_pengiriman' => 70000, 'items' => [['id_detail' => $detail->id_detail, 'harga_satuan' => 120000]]])->assertOk();

        $this->assertDatabaseHas('pesanan', ['kode_pesanan' => $code, 'status_pesanan' => 'disetujui']);
        $this->assertDatabaseHas('jobs', ['queue' => 'firebase']);
    }

    public function test_rollback_also_removes_firebase_job(): void
    {
        $this->enableFirebase();
        DB::beginTransaction();
        app(FirebaseGateway::class)->enqueue('TF-ABCDEFGHIJKL');
        $this->assertDatabaseCount('jobs', 1);

        DB::rollBack();

        $this->assertDatabaseCount('jobs', 0);
    }

    public function test_firestore_mirror_contains_status_and_owner_without_shipping_details(): void
    {
        $buyer = $this->buyer();
        $code = $this->order($buyer);
        $this->enableFirebase();
        Http::preventStrayRequests();
        Http::fake(['https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'test-oauth-token']),
            'https://firestore.googleapis.com/*' => Http::response(['name' => 'order'])]);

        app(FirebaseGateway::class)->publish($code, 'test-event', false);

        Http::assertSent(fn ($request): bool => $request->method() === 'PATCH'
            && $request['fields']['uid']['stringValue'] === 'buyer_'.$buyer->id_user
            && $request['fields']['status_pesanan']['stringValue'] === 'menunggu_persetujuan'
            && ! isset($request['fields']['data_pengiriman']));
    }

    public function test_invalid_fcm_device_is_removed_after_firestore_update(): void
    {
        $buyer = $this->buyer();
        $code = $this->order($buyer);
        $session = $buyer->createToken('mobile');
        DB::table('firebase_devices')->insert(['id_user' => $buyer->id_user, 'session_id' => $session->accessToken->id,
            'token_hash' => hash('sha256', 'expired-device'), 'token' => Crypt::encryptString('expired-device'), 'server' => 'https://tamafarm.example/api', 'updated_at' => now()]);
        $this->enableFirebase();
        Http::preventStrayRequests();
        Http::fake(['https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'test-oauth-token']),
            'https://firestore.googleapis.com/*' => Http::response(['name' => 'order']),
            'https://fcm.googleapis.com/*' => Http::response(['error' => ['details' => [['errorCode' => 'UNREGISTERED']]]], 404)]);

        app(FirebaseGateway::class)->publish($code, 'test-event', true);

        $this->assertDatabaseCount('firebase_devices', 0);
        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'fcm.googleapis.com') && $request['message']['data']['uid'] === 'buyer_'.$buyer->id_user);
    }
}
