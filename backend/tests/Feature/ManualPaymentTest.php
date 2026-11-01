<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PelangganSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class ManualPaymentTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function order(): int
    {
        $this->seed(PelangganSeeder::class);
        $buyer = User::where('username', 'pembeli_andi')->firstOrFail();
        $customer = DB::table('pelanggan')->where('id_user', $buyer->id_user)->first();
        $this->actingAs($buyer, 'sanctum');
        config(['services.supabase.url' => 'https://storage.test', 'services.supabase.server_key' => 'secret-test', 'services.supabase.proof_bucket' => 'bukti-pembayaran',
            'services.transfer' => ['bank' => 'Bank Test', 'account' => '123456', 'holder' => 'Tamafarm Test'], 'services.midtrans.dp_percent' => 50]);
        Http::preventStrayRequests();

        return DB::table('pesanan')->insertGetId(['kode_pesanan' => 'TF-MANUALTEST', 'id_pelanggan' => $customer->id_pelanggan,
            'tanggal' => now(), 'status_pesanan' => 'menunggu_dp', 'status_penawaran' => 'diterima', 'total' => 100001,
            'mata_uang' => 'IDR', 'created_at' => now(), 'updated_at' => now()], 'id_pesanan');
    }

    private function payload(string $kind = 'dp'): array
    {
        return ['jenis' => $kind, 'upload_key' => (string) Str::uuid(), 'bukti' => UploadedFile::fake()->createWithContent('proof.png', file_get_contents(__DIR__.'/../Fixtures/proof.png'))];
    }

    public function test_simulation_upload_without_bank_is_labelled_and_can_be_verified(): void
    {
        $order = $this->order();
        config(['services.payment_simulation' => true, 'services.transfer' => ['bank' => null, 'account' => null, 'holder' => null]]);
        Http::fake(['https://storage.test/storage/v1/object/bukti-pembayaran/*' => Http::response([], 200)]);
        $this->getJson('/api/pembeli/pesanan/TF-MANUALTEST')->assertOk()->assertJsonPath('data.simulasi_pembayaran', true)->assertJsonPath('data.transfer_aktif', true)->assertJsonPath('data.pembayaran_aktif', false);
        $payment = $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertOk()->json('data.id_pembayaran');
        $this->assertDatabaseHas('pembayaran', ['id_pembayaran' => $payment, 'metode' => 'simulasi', 'status_bayar' => 'menunggu']);
        $this->actingAs(User::factory()->create(), 'sanctum')->getJson('/api/pengelolaan/pesanan/TF-MANUALTEST')->assertOk()->assertJsonPath('data.pembayaran.0.simulasi', true)->assertJsonPath('data.pembayaran.0.ada_bukti', true);
        $this->postJson('/api/pengelolaan/pesanan/TF-MANUALTEST/pembayaran/'.$payment.'/verifikasi', ['keputusan' => 'dibayar'])->assertOk();
        $this->assertDatabaseHas('pesanan', ['id_pesanan' => $order, 'status_pesanan' => 'dp_dibayar']);
        config(['services.payment_simulation' => false]);
        $this->getJson('/api/pengelolaan/pesanan/TF-MANUALTEST')->assertOk()->assertJsonPath('data.simulasi_pembayaran', true);
        Http::assertSentCount(1);
    }

    public function test_simulation_cannot_open_gateway_payment_or_bypass_storage_configuration(): void
    {
        $this->order();
        config(['services.payment_simulation' => true, 'services.midtrans.server_key' => 'test-key', 'services.supabase.server_key' => null]);
        $this->postJson('/api/pesanan/TF-MANUALTEST/pembayaran', ['jenis' => 'dp'])->assertConflict();
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertServiceUnavailable();
        $this->assertDatabaseCount('pembayaran', 0);
        Http::assertNothingSent();
    }

    public function test_existing_real_payment_remains_real_when_simulation_is_enabled(): void
    {
        $order = $this->order();
        $this->payment($order, 'dibayar');
        config(['services.payment_simulation' => true]);
        Http::fake(['https://storage.test/storage/v1/object/bukti-pembayaran/*' => Http::response([], 200)]);
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload('pelunasan'))->assertOk();
        $this->getJson('/api/pembeli/pesanan/TF-MANUALTEST')->assertOk()->assertJsonPath('data.simulasi_pembayaran', false)->assertJsonPath('data.pembayaran.0.simulasi', false);
        $this->assertDatabaseHas('pembayaran', ['jenis' => 'pelunasan', 'metode' => 'transfer_manual']);
        Http::assertSentCount(1);
    }

    public function test_simulation_balance_stays_simulated_after_mode_changes_and_finishes_order(): void
    {
        $order = $this->order();
        $dp = $this->payment($order, 'dibayar');
        DB::table('pembayaran')->where('id_pembayaran', $dp)->update(['metode' => 'simulasi']);
        config(['services.payment_simulation' => false, 'services.transfer' => ['bank' => null, 'account' => null, 'holder' => null]]);
        Http::fake(['https://storage.test/storage/v1/object/bukti-pembayaran/*' => Http::response([], 200)]);
        $payment = $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload('pelunasan'))->assertOk()->assertJsonPath('data.jumlah', 50000)->json('data.id_pembayaran');
        $this->assertDatabaseHas('pembayaran', ['id_pembayaran' => $payment, 'metode' => 'simulasi', 'status_bayar' => 'menunggu']);
        $this->actingAs(User::factory()->create(), 'sanctum')->postJson('/api/pengelolaan/pesanan/TF-MANUALTEST/pembayaran/'.$payment.'/verifikasi', ['keputusan' => 'dibayar'])->assertOk();
        $this->getJson('/api/pengelolaan/pesanan/TF-MANUALTEST')->assertOk()->assertJsonPath('data.simulasi_pembayaran', true)->assertJsonPath('data.status_pesanan', 'lunas');
        $this->assertDatabaseHas('pesanan', ['id_pesanan' => $order, 'status_pesanan' => 'lunas']);
        Http::assertSentCount(1);
    }

    private function payment(int $order, string $state = 'menunggu', string $kind = 'dp'): int
    {
        return DB::table('pembayaran')->insertGetId(['id_pesanan' => $order, 'jenis' => $kind, 'metode' => 'transfer_manual',
            'jumlah' => $kind === 'dp' ? 50001 : 50000, 'mata_uang' => 'IDR', 'status_bayar' => $state,
            'bukti_path' => $order.'/proof.jpg', 'upload_key' => (string) Str::uuid(), 'created_at' => now(), 'updated_at' => now()], 'id_pembayaran');
    }

    public function test_upload_returns_401_without_login(): void
    {
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertUnauthorized();
        $this->assertDatabaseCount('pembayaran', 0);
    }

    public function test_other_buyer_cannot_upload_or_view_proof(): void
    {
        $order = $this->order();
        $payment = $this->payment($order);
        $other = User::where('role', 'pelanggan')->where('username', '!=', 'pembeli_andi')->firstOrFail();
        $this->actingAs($other, 'sanctum')->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertNotFound();
        $this->getJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti/'.$payment)->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_upload_calculates_dp_keeps_order_unpaid_and_reuses_upload_key(): void
    {
        $order = $this->order();
        Http::fake(['https://storage.test/storage/v1/object/bukti-pembayaran/*' => Http::response(['Key' => 'proof'], 200)]);
        $payload = $this->payload();
        $payload['jumlah'] = 1;
        $payload['status_bayar'] = 'dibayar';
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $payload)->assertOk()->assertJsonPath('data.jumlah', 50001)->assertJsonPath('data.status_bayar', 'menunggu');
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $payload)->assertOk();
        $this->assertDatabaseCount('pembayaran', 1);
        $this->assertDatabaseHas('pesanan', ['id_pesanan' => $order, 'status_pesanan' => 'menunggu_dp']);
        Http::assertSentCount(1);
        Http::assertSent(fn ($request): bool => $request->hasHeader('apikey', 'secret-test') && $request->hasHeader('Content-Type', 'image/png'));
        $this->getJson('/api/pembeli/pesanan/TF-MANUALTEST')->assertOk()->assertJsonPath('data.pembayaran.0.ada_bukti', true)->assertJsonMissing(['bukti_path']);
    }

    #[TestWith(['menunggu'])]
    #[TestWith(['ditolak'])]
    public function test_upload_returns_409_before_offer_is_accepted(string $offer): void
    {
        $order = $this->order();
        DB::table('pesanan')->where('id_pesanan', $order)->update(['status_penawaran' => $offer]);
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertConflict();
        $this->assertDatabaseCount('pembayaran', 0);
        Http::assertNothingSent();
    }

    public function test_pending_payment_blocks_another_upload_and_gateway_checkout(): void
    {
        $order = $this->order();
        $this->payment($order);
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertConflict();
        $this->postJson('/api/pesanan/TF-MANUALTEST/pembayaran', ['jenis' => 'dp'])->assertConflict();
        $this->postJson('/api/pesanan/TF-MANUALTEST/status-pembayaran')->assertOk();
        $this->assertDatabaseCount('pembayaran', 1);
        Http::assertNothingSent();
    }

    public function test_balance_requires_paid_dp(): void
    {
        $this->order();
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload('pelunasan'))->assertConflict();
        Http::assertNothingSent();
    }

    public function test_pending_gateway_payment_blocks_manual_upload(): void
    {
        $order = $this->order();
        $payment = $this->payment($order);
        DB::table('pembayaran')->where('id_pembayaran', $payment)->update(['metode' => 'midtrans', 'id_transaksi' => 'TEST-PENDING', 'bukti_path' => null]);
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertConflict();
        $this->assertDatabaseCount('pembayaran', 1);
        Http::assertNothingSent();
    }

    public function test_proof_identifier_from_another_order_returns_404_for_admin(): void
    {
        $order = $this->order();
        $payment = $this->payment($order);
        $other = DB::table('pesanan')->insertGetId(array_merge((array) DB::table('pesanan')->where('id_pesanan', $order)->first(), ['id_pesanan' => null, 'kode_pesanan' => 'TF-OTHER']), 'id_pesanan');
        $this->actingAs(User::factory()->create(), 'sanctum');
        $this->getJson('/api/pengelolaan/pesanan/TF-OTHER/bukti/'.$payment)->assertNotFound();
        $this->postJson('/api/pengelolaan/pesanan/TF-OTHER/pembayaran/'.$payment.'/verifikasi', ['keputusan' => 'dibayar'])->assertNotFound();
        $this->assertDatabaseHas('pembayaran', ['id_pembayaran' => $payment, 'id_pesanan' => $order, 'status_bayar' => 'menunggu']);
        Http::assertNothingSent();
    }

    public function test_signed_url_failure_returns_502_without_exposing_storage_error(): void
    {
        $order = $this->order();
        $payment = $this->payment($order);
        Http::fake(['https://storage.test/storage/v1/object/sign/bukti-pembayaran/*' => Http::response(['error' => 'internal secret'], 403)]);
        $this->getJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti/'.$payment)->assertStatus(502)->assertJsonMissing(['error' => 'internal secret']);
        Http::assertSentCount(1);
    }

    #[TestWith(['key'])]
    #[TestWith(['bank'])]
    public function test_missing_configuration_returns_503_without_upload(string $missing): void
    {
        $this->order();
        config([$missing === 'key' ? 'services.supabase.server_key' : 'services.transfer.bank' => null]);
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertServiceUnavailable();
        $this->assertDatabaseCount('pembayaran', 0);
        Http::assertNothingSent();
    }

    #[TestWith(['text'])]
    #[TestWith(['size'])]
    #[TestWith(['dimensions'])]
    public function test_invalid_proof_returns_422(string $invalid): void
    {
        $this->order();
        $payload = $this->payload();
        $payload['bukti'] = match ($invalid) {
            'text' => UploadedFile::fake()->createWithContent('proof.jpg', 'not an image'),
            'size' => UploadedFile::fake()->createWithContent('proof.png', file_get_contents(__DIR__.'/../Fixtures/proof.png'))->size(2049),
            'dimensions' => UploadedFile::fake()->createWithContent('proof.png', file_get_contents(__DIR__.'/../Fixtures/proof-wide.png')),
        };
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $payload)->assertUnprocessable()->assertJsonValidationErrors('bukti');
        Http::assertNothingSent();
    }

    #[TestWith([true])]
    #[TestWith([false])]
    public function test_storage_failure_returns_502_without_payment(bool $timeout): void
    {
        $this->order();
        Http::fake(['https://storage.test/storage/v1/object/bukti-pembayaran/*' => $timeout ? Http::failedConnection() : Http::response([], 403)]);
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertStatus(502);
        $this->assertDatabaseCount('pembayaran', 0);
        Http::assertSentCount(1);
    }

    public function test_buyer_cannot_verify_own_payment(): void
    {
        $order = $this->order();
        $payment = $this->payment($order);
        $this->postJson('/api/pengelolaan/pesanan/TF-MANUALTEST/pembayaran/'.$payment.'/verifikasi', ['keputusan' => 'dibayar'])->assertForbidden();
        $this->assertDatabaseHas('pembayaran', ['id_pembayaran' => $payment, 'status_bayar' => 'menunggu']);
    }

    public function test_admin_approval_is_idempotent_and_cannot_be_reversed(): void
    {
        $order = $this->order();
        $payment = $this->payment($order);
        $this->actingAs(User::factory()->create(), 'sanctum');
        $path = '/api/pengelolaan/pesanan/TF-MANUALTEST/pembayaran/'.$payment.'/verifikasi';
        $this->postJson($path, ['keputusan' => 'dibayar'])->assertOk();
        $this->postJson($path, ['keputusan' => 'dibayar'])->assertOk();
        $this->postJson($path, ['keputusan' => 'ditolak', 'catatan' => 'Ubah'])->assertConflict();
        $this->assertDatabaseHas('pembayaran', ['id_pembayaran' => $payment, 'status_bayar' => 'dibayar']);
        $this->assertDatabaseHas('pesanan', ['id_pesanan' => $order, 'status_pesanan' => 'dp_dibayar']);
    }

    public function test_rejection_requires_reason_and_allows_corrected_proof(): void
    {
        $order = $this->order();
        $buyer = User::where('username', 'pembeli_andi')->firstOrFail();
        $payment = $this->payment($order);
        $this->actingAs(User::factory()->create(), 'sanctum');
        $path = '/api/pengelolaan/pesanan/TF-MANUALTEST/pembayaran/'.$payment.'/verifikasi';
        $this->postJson($path, ['keputusan' => 'ditolak'])->assertUnprocessable();
        $this->postJson($path, ['keputusan' => 'ditolak', 'catatan' => 'Foto tidak terbaca'])->assertOk();
        $this->assertDatabaseHas('pembayaran', ['status_bayar' => 'ditolak', 'catatan_verifikasi' => 'Foto tidak terbaca']);
        $this->actingAs($buyer, 'sanctum');
        Http::fake(['https://storage.test/storage/v1/object/bukti-pembayaran/*' => Http::response([], 200)]);
        $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload())->assertOk();
        $this->assertDatabaseCount('pembayaran', 2);
        Http::assertSentCount(1);
    }

    public function test_balance_upload_and_approval_mark_order_paid(): void
    {
        $order = $this->order();
        $this->payment($order, 'dibayar');
        DB::table('pesanan')->where('id_pesanan', $order)->update(['status_pesanan' => 'dikirim']);
        Http::fake(['https://storage.test/storage/v1/object/bukti-pembayaran/*' => Http::response([], 200)]);
        $payment = $this->postJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti', $this->payload('pelunasan'))->assertOk()->assertJsonPath('data.jumlah', 50000)->json('data.id_pembayaran');
        $this->actingAs(User::factory()->create(), 'sanctum')->postJson('/api/pengelolaan/pesanan/TF-MANUALTEST/pembayaran/'.$payment.'/verifikasi', ['keputusan' => 'dibayar'])->assertOk();
        $this->assertDatabaseHas('pesanan', ['id_pesanan' => $order, 'status_pesanan' => 'lunas']);
        Http::assertSentCount(1);
    }

    public function test_authorized_buyer_and_admin_receive_temporary_proof_url(): void
    {
        $order = $this->order();
        $payment = $this->payment($order);
        Http::fake(['https://storage.test/storage/v1/object/sign/bukti-pembayaran/*' => Http::response(['signedURL' => '/object/sign/bukti-pembayaran/proof.jpg?token=test'])]);
        $this->getJson('/api/pembeli/pesanan/TF-MANUALTEST/bukti/'.$payment)->assertOk()->assertJsonPath('data.url', 'https://storage.test/storage/v1/object/sign/bukti-pembayaran/proof.jpg?token=test');
        $this->actingAs(User::factory()->create(), 'sanctum')->getJson('/api/pengelolaan/pesanan/TF-MANUALTEST/bukti/'.$payment)->assertOk();
        Http::assertSentCount(2);
        Http::assertSent(fn ($request): bool => $request['expiresIn'] === 300);
    }
}
