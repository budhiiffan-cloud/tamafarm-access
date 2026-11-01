<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PelangganSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class BuyerPaymentTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function order(): int
    {
        $this->seed(PelangganSeeder::class);
        $user = User::where('username', 'pembeli_andi')->firstOrFail();
        $customer = DB::table('pelanggan')->where('id_user', $user->id_user)->first();
        $this->actingAs($user, 'sanctum');
        config(['services.midtrans.server_key' => 'sandbox-test-key', 'services.midtrans.signature_key' => 'signature-test-key', 'services.midtrans.dp_percent' => 50]);
        Http::preventStrayRequests();

        return DB::table('pesanan')->insertGetId([
            'kode_pesanan' => 'TF-PAYMENTTEST', 'id_pelanggan' => $customer->id_pelanggan, 'tanggal' => now(),
            'status_pesanan' => 'menunggu_dp', 'status_penawaran' => 'diterima', 'total' => 100000,
            'mata_uang' => 'IDR', 'data_pengiriman' => json_encode(['nama' => $customer->nama, 'no_hp' => $customer->no_hp]),
            'created_at' => now(), 'updated_at' => now(),
        ], 'id_pesanan');
    }

    private function payment(int $orderId, string $kind = 'dp'): void
    {
        DB::table('pembayaran')->insert([
            'id_pesanan' => $orderId, 'jenis' => $kind, 'jumlah' => 50000, 'mata_uang' => 'IDR', 'status_bayar' => 'menunggu',
            'id_transaksi' => 'TEST-'.$kind, 'snap_token' => 'snap-test', 'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-test',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function notification(string $transaction = 'TEST-dp'): array
    {
        return ['order_id' => $transaction, 'status_code' => '200', 'gross_amount' => '50000.00', 'signature_key' => hash('sha512', $transaction.'20050000.00signature-test-key')];
    }

    private function remotePayload(string $state = 'settlement', string $transaction = 'TEST-dp'): array
    {
        return ['order_id' => $transaction, 'gross_amount' => '50000.00', 'currency' => 'IDR', 'status_code' => '200', 'transaction_status' => $state, 'fraud_status' => 'accept', 'payment_type' => 'bank_transfer'];
    }

    public function test_missing_key_returns_503_without_creating_payment(): void
    {
        $this->order();
        config(['services.midtrans.server_key' => null]);

        $this->postJson('/api/pesanan/TF-PAYMENTTEST/pembayaran', ['jenis' => 'dp'])->assertServiceUnavailable();

        $this->assertDatabaseCount('pembayaran', 0);
        Http::assertNothingSent();
    }

    public function test_server_calculates_dp_and_reuses_existing_checkout(): void
    {
        $orderId = $this->order();
        Http::fake([
            'https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'test-token', 'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token'], 201),
            'https://api.sandbox.midtrans.com/v2/*/status' => Http::response(['status_code' => '404'], 404),
        ]);

        $this->postJson('/api/pesanan/TF-PAYMENTTEST/pembayaran', ['jenis' => 'dp', 'jumlah' => 1])->assertOk()->assertJsonPath('data.jumlah', 50000);
        $this->postJson('/api/pesanan/TF-PAYMENTTEST/pembayaran', ['jenis' => 'dp'])->assertOk();

        $this->assertDatabaseCount('pembayaran', 1);
        $this->assertDatabaseHas('pembayaran', ['id_pesanan' => $orderId, 'jumlah' => 50000]);
        Http::assertSentCount(2);
        Http::assertSent(fn ($request): bool => $request->url() === 'https://app.sandbox.midtrans.com/snap/v1/transactions' && $request['transaction_details']['gross_amount'] === 50000);
    }

    public function test_payment_before_offer_acceptance_returns_409(): void
    {
        $orderId = $this->order();
        DB::table('pesanan')->where('id_pesanan', $orderId)->update(['status_penawaran' => 'menunggu']);

        $this->postJson('/api/pesanan/TF-PAYMENTTEST/pembayaran', ['jenis' => 'dp'])->assertConflict();

        Http::assertNothingSent();
        $this->assertDatabaseCount('pembayaran', 0);
    }

    public function test_balance_payment_requires_paid_dp(): void
    {
        $this->order();

        $this->postJson('/api/pesanan/TF-PAYMENTTEST/pembayaran', ['jenis' => 'pelunasan'])->assertConflict();

        Http::assertNothingSent();
    }

    public function test_invalid_notification_signature_returns_401(): void
    {
        $orderId = $this->order();
        $this->payment($orderId);
        $notification = $this->notification();
        $notification['signature_key'] = str_repeat('0', 128);

        $this->postJson('/api/midtrans/notification', $notification)->assertUnauthorized();

        Http::assertNothingSent();
        $this->assertDatabaseHas('pembayaran', ['status_bayar' => 'menunggu']);
    }

    public function test_duplicate_settlement_updates_once_and_pending_cannot_reverse_it(): void
    {
        $orderId = $this->order();
        $this->payment($orderId);
        Http::fake(['https://api.sandbox.midtrans.com/v2/TEST-dp/status' => Http::sequence()->push($this->remotePayload())->push($this->remotePayload())->push($this->remotePayload('pending'))]);

        $this->postJson('/api/midtrans/notification', $this->notification())->assertOk();
        $this->postJson('/api/midtrans/notification', $this->notification())->assertOk();
        $this->postJson('/api/midtrans/notification', $this->notification())->assertOk();

        $this->assertDatabaseCount('pembayaran', 1);
        $this->assertDatabaseHas('pembayaran', ['status_bayar' => 'dibayar', 'jumlah' => 50000]);
        $this->assertDatabaseHas('pesanan', ['status_pesanan' => 'dp_dibayar']);
        Http::assertSentCount(3);
    }

    public function test_posted_success_cannot_override_verified_server_status(): void
    {
        $orderId = $this->order();
        $this->payment($orderId);
        Http::fake(['https://api.sandbox.midtrans.com/v2/TEST-dp/status' => Http::response($this->remotePayload('pending'))]);

        $this->postJson('/api/midtrans/notification', array_merge($this->notification(), ['transaction_status' => 'settlement']))->assertOk();

        $this->assertDatabaseHas('pembayaran', ['status_bayar' => 'menunggu']);
        Http::assertSentCount(1);
    }

    #[TestWith(['capture', 'challenge'])]
    #[TestWith(['settlement', 'deny'])]
    public function test_fraud_not_accepted_does_not_mark_payment_paid(string $state, string $fraud): void
    {
        $orderId = $this->order();
        $this->payment($orderId);
        Http::fake(['https://api.sandbox.midtrans.com/v2/TEST-dp/status' => Http::response(array_merge($this->remotePayload($state), ['fraud_status' => $fraud]))]);

        $this->postJson('/api/midtrans/notification', $this->notification())->assertOk();

        $this->assertDatabaseHas('pembayaran', ['status_bayar' => 'menunggu']);
        Http::assertSentCount(1);
    }

    public function test_amount_mismatch_returns_422_without_marking_payment_paid(): void
    {
        $orderId = $this->order();
        $this->payment($orderId);
        Http::fake(['https://api.sandbox.midtrans.com/v2/TEST-dp/status' => Http::response(array_merge($this->remotePayload(), ['gross_amount' => '1.00']))]);

        $this->postJson('/api/midtrans/notification', $this->notification())->assertUnprocessable();

        $this->assertDatabaseHas('pembayaran', ['status_bayar' => 'menunggu']);
        Http::assertSentCount(1);
    }

    public function test_gateway_connection_failure_returns_502_without_creating_payment(): void
    {
        $this->order();
        Http::fake(['https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::failedConnection()]);

        $this->postJson('/api/pesanan/TF-PAYMENTTEST/pembayaran', ['jenis' => 'dp'])->assertStatus(502);

        $this->assertDatabaseCount('pembayaran', 0);
        Http::assertSentCount(1);
    }

    public function test_balance_settlement_marks_order_fully_paid(): void
    {
        $orderId = $this->order();
        $this->payment($orderId);
        DB::table('pembayaran')->where('id_transaksi', 'TEST-dp')->update(['status_bayar' => 'dibayar']);
        $this->payment($orderId, 'pelunasan');
        Http::fake(['https://api.sandbox.midtrans.com/v2/TEST-pelunasan/status' => Http::response($this->remotePayload('settlement', 'TEST-pelunasan'))]);

        $this->postJson('/api/midtrans/notification', $this->notification('TEST-pelunasan'))->assertOk();

        $this->assertDatabaseHas('pesanan', ['status_pesanan' => 'lunas']);
        $this->assertDatabaseHas('pembayaran', ['jenis' => 'pelunasan', 'status_bayar' => 'dibayar']);
        Http::assertSentCount(1);
    }
}
