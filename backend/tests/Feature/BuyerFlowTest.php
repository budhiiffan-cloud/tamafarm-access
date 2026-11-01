<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\KatalogProdukSeeder;
use Database\Seeders\PelangganSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class BuyerFlowTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function payload(array $changes = []): array
    {
        $this->seed(KatalogProdukSeeder::class);
        $id = DB::table('produk_lobster')->where('nama_produk', 'Lobster Air Tawar Small')->value('id_produk');

        return array_replace([
            'nama' => 'Pembeli Test', 'no_hp' => '6280000009999', 'alamat' => 'Alamat test', 'negara' => 'Indonesia', 'tipe_pembeli' => 'perorangan',
            'items' => [['id_produk' => $id, 'jumlah' => 2]],
        ], $changes);
    }

    private function buyer(): User
    {
        $this->seed(PelangganSeeder::class);

        return User::where('username', 'pembeli_andi')->firstOrFail();
    }

    #[TestWith([null])]
    #[TestWith(['invalid-token'])]
    public function test_mobile_checkout_returns_401_without_valid_session(?string $token): void
    {
        $payload = $this->payload();
        if ($token !== null) {
            $this->withToken($token);
        }

        $this->postJson('/api/pembeli/pesanan', $payload)->assertUnauthorized();

        $this->assertDatabaseCount('pesanan', 0);
        $this->assertDatabaseCount('pelanggan', 0);
    }

    public function test_mobile_checkout_returns_403_for_admin(): void
    {
        $admin = User::factory()->create();
        $payload = $this->payload();

        $this->actingAs($admin, 'sanctum')->postJson('/api/pembeli/pesanan', $payload)->assertForbidden();

        $this->assertDatabaseCount('pesanan', 0);
    }

    public function test_mobile_order_appears_in_buyer_history_and_admin_inbox(): void
    {
        $buyer = $this->buyer();
        $payload = $this->payload();
        $payload['items'][0]['jumlah'] = '1.25';

        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/pesanan', $payload)->assertCreated();
        $code = $response->json('data.kode_pesanan');

        $response->assertJsonPath('data.token_akses', null);
        $this->assertDatabaseHas('detail_pesanan', ['jumlah' => 1.25, 'subtotal' => 150000]);
        $this->assertDatabaseHas('pesanan', ['kode_pesanan' => $code, 'status_pesanan' => 'menunggu_persetujuan']);
        $this->getJson('/api/pembeli/pesanan')->assertOk()->assertJsonPath('data.data.0.kode_pesanan', $code);
        $this->getJson('/api/pesanan/'.$code)->assertOk()->assertJsonPath('data.total', 150000);

        $admin = User::factory()->create();
        $this->actingAs($admin, 'sanctum')->getJson('/api/pengelolaan/pesanan')
            ->assertOk()->assertJsonPath('data.data.0.kode_pesanan', $code);
    }

    public function test_mobile_buyer_reads_and_accepts_latest_admin_offer(): void
    {
        $buyer = $this->buyer();
        $payload = $this->payload();
        $code = $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/pesanan', $payload)
            ->assertCreated()->json('data.kode_pesanan');
        $detail = DB::table('detail_pesanan')->first();
        $admin = User::factory()->create();
        $this->actingAs($admin, 'sanctum')->postJson('/api/pengelolaan/pesanan/'.$code.'/penawaran', [
            'biaya_pengiriman' => 10000, 'items' => [['id_detail' => $detail->id_detail, 'harga_satuan' => 110000]],
        ])->assertOk();

        $this->actingAs($buyer, 'sanctum')->getJson('/api/pembeli/pesanan/'.$code)
            ->assertOk()->assertJsonPath('data.status_pesanan', 'disetujui')
            ->assertJsonPath('data.total', 230000)->assertJsonPath('data.versi_penawaran', 1);
        $this->postJson('/api/pembeli/pesanan/'.$code.'/penawaran', ['keputusan' => 'diterima', 'versi_penawaran' => 1])
            ->assertOk()->assertJsonPath('data.status_pesanan', 'menunggu_dp');

        $this->assertDatabaseHas('pesanan', ['kode_pesanan' => $code, 'status_penawaran' => 'diterima']);
        $other = User::where('username', 'pembeli_sari')->firstOrFail();
        $this->actingAs($other, 'sanctum')->getJson('/api/pembeli/pesanan/'.$code)->assertNotFound();
    }

    public function test_mobile_order_details_and_actions_return_401_without_login(): void
    {
        $this->getJson('/api/pembeli/pesanan/TF-NOT-ACCESSIBLE')->assertUnauthorized();
        $this->postJson('/api/pembeli/pesanan/TF-NOT-ACCESSIBLE/penawaran', ['keputusan' => 'diterima', 'versi_penawaran' => 1])->assertUnauthorized();
        $this->postJson('/api/pembeli/pesanan/TF-NOT-ACCESSIBLE/diterima')->assertUnauthorized();
        $this->postJson('/api/pembeli/pesanan/TF-NOT-ACCESSIBLE/pembayaran')->assertUnauthorized();
        $this->postJson('/api/pembeli/pesanan/TF-NOT-ACCESSIBLE/status-pembayaran')->assertUnauthorized();
    }

    public function test_mobile_flat_checkout_uses_customer_profile_and_preserves_coordinates(): void
    {
        $buyer = $this->buyer();
        $payload = $this->payload();
        $customer = DB::table('pelanggan')->where('id_user', $buyer->id_user)->first();

        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/pesanan', [
            'id_produk' => $payload['items'][0]['id_produk'], 'qty' => 2,
            'latitude' => -6.917464, 'longitude' => 107.619123,
        ]);

        $response->assertCreated();
        $code = $response->json('data.kode_pesanan');
        $this->assertDatabaseHas('pesanan', ['kode_pesanan' => $code, 'id_pelanggan' => $customer->id_pelanggan]);
        $this->assertDatabaseHas('detail_pesanan', ['jumlah' => 2, 'subtotal' => 240000]);
        $this->getJson('/api/pembeli/pesanan/'.$code)->assertOk()
            ->assertJsonPath('data.data_pengiriman.nama', $customer->nama)
            ->assertJsonPath('data.data_pengiriman.latitude', -6.917464)
            ->assertJsonPath('data.data_pengiriman.longitude', 107.619123);
    }

    public function test_guest_checkout_defaults_country_and_buyer_type_when_omitted(): void
    {
        $payload = $this->payload();
        unset($payload['negara'], $payload['tipe_pembeli']);

        $response = $this->postJson('/api/pesanan', $payload);

        $response->assertCreated();
        $this->assertDatabaseHas('pelanggan', ['nama' => 'Pembeli Test', 'negara' => 'Indonesia', 'tipe_pembeli' => 'perorangan']);
        $this->assertDatabaseHas('pesanan', ['kode_pesanan' => $response->json('data.kode_pesanan'), 'total' => 240000]);
    }

    public function test_guest_order_requires_private_token_to_view(): void
    {
        $payload = $this->payload();
        $response = $this->postJson('/api/pesanan', $payload)->assertCreated();
        $code = $response->json('data.kode_pesanan');
        $token = $response->json('data.token_akses');

        $this->getJson('/api/pesanan/'.$code)->assertNotFound();
        $this->withHeaders(['X-Order-Token' => $token])->getJson('/api/pesanan/'.$code)
            ->assertOk()->assertJsonPath('data.total', 240000)->assertJsonMissingPath('data.token_akses_hash');
        $this->assertDatabaseHas('pesanan', ['kode_pesanan' => $code, 'token_akses_hash' => hash('sha256', $token)]);
    }

    public function test_total_uses_catalog_price_and_ignores_client_totals(): void
    {
        $payload = $this->payload(['total' => 1]);
        $payload['items'][0]['harga_satuan'] = 1;

        $this->postJson('/api/pesanan', $payload)->assertCreated();

        $this->assertDatabaseHas('detail_pesanan', ['jumlah' => 2, 'harga_satuan' => 120000, 'subtotal' => 240000]);
        $this->assertDatabaseHas('pesanan', ['total' => 240000, 'status_pesanan' => 'menunggu_persetujuan']);
    }

    #[TestWith(['restoran', 1])]
    #[TestWith(['luar_negeri', 19])]
    #[TestWith(['perorangan', 100])]
    #[TestWith(['perorangan', 0])]
    public function test_invalid_quantity_returns_422_without_creating_order(string $type, int $quantity): void
    {
        $payload = $this->payload(['tipe_pembeli' => $type]);
        $payload['items'][0]['jumlah'] = $quantity;

        $this->postJson('/api/pesanan', $payload)->assertUnprocessable()->assertJsonValidationErrors('items.0.jumlah');

        $this->assertDatabaseCount('pesanan', 0);
        $this->assertDatabaseCount('pelanggan', 0);
    }

    public function test_fractional_package_quantity_returns_422(): void
    {
        $payload = $this->payload();
        $payload['items'] = [['id_produk' => DB::table('produk_lobster')->where('satuan', 'paket')->value('id_produk'), 'jumlah' => 1.5]];

        $this->postJson('/api/pesanan', $payload)->assertUnprocessable()->assertJsonValidationErrors('items.0.jumlah');
    }

    public function test_customer_cannot_view_another_customers_order(): void
    {
        $buyer = $this->buyer();
        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan', $this->payload())->assertCreated();
        $other = User::where('username', 'pembeli_sari')->firstOrFail();

        $this->actingAs($other, 'sanctum')->getJson('/api/pesanan/'.$response->json('data.kode_pesanan'))->assertNotFound();
        $this->getJson('/api/pembeli/pesanan')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_accepting_offer_reserves_stock_once_and_prevents_revisions(): void
    {
        $buyer = $this->buyer();
        $payload = $this->payload();
        $response = $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan', $payload)->assertCreated();
        $code = $response->json('data.kode_pesanan');
        $detail = DB::table('detail_pesanan')->first();
        $admin = User::factory()->create();
        $this->actingAs($admin, 'sanctum')->postJson('/api/pengelolaan/pesanan/'.$code.'/penawaran', [
            'biaya_pengiriman' => 10000, 'items' => [['id_detail' => $detail->id_detail, 'harga_satuan' => 110000]],
        ])->assertOk();

        $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan/'.$code.'/penawaran', ['keputusan' => 'diterima', 'versi_penawaran' => 0])->assertConflict();
        $this->assertDatabaseHas('produk_lobster', ['id_produk' => $payload['items'][0]['id_produk'], 'stok' => 25.5]);
        $this->postJson('/api/pesanan/'.$code.'/penawaran', ['keputusan' => 'diterima', 'versi_penawaran' => 1])->assertOk()->assertJsonPath('data.total', 230000);

        $this->assertDatabaseHas('produk_lobster', ['id_produk' => $payload['items'][0]['id_produk'], 'stok' => 23.5]);
        $this->postJson('/api/pesanan/'.$code.'/penawaran', ['keputusan' => 'diterima', 'versi_penawaran' => 1])->assertConflict();
        $this->actingAs($admin, 'sanctum')->postJson('/api/pengelolaan/pesanan/'.$code.'/penawaran', ['biaya_pengiriman' => 0, 'items' => [['id_detail' => $detail->id_detail, 'harga_satuan' => 1]]])->assertConflict();
        $this->assertDatabaseHas('produk_lobster', ['id_produk' => $payload['items'][0]['id_produk'], 'stok' => 23.5]);
    }

    public function test_stock_shortage_during_acceptance_keeps_order_and_stock_unchanged(): void
    {
        $buyer = $this->buyer();
        $payload = $this->payload();
        $code = $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan', $payload)->json('data.kode_pesanan');
        $detail = DB::table('detail_pesanan')->first();
        $admin = User::factory()->create();
        $this->actingAs($admin, 'sanctum')->postJson('/api/pengelolaan/pesanan/'.$code.'/penawaran', ['biaya_pengiriman' => 0, 'items' => [['id_detail' => $detail->id_detail, 'harga_satuan' => 120000]]])->assertOk();
        DB::table('produk_lobster')->where('id_produk', $detail->id_produk)->update(['stok' => 1]);

        $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan/'.$code.'/penawaran', ['keputusan' => 'diterima', 'versi_penawaran' => 1])->assertConflict();

        $this->assertDatabaseHas('pesanan', ['kode_pesanan' => $code, 'status_penawaran' => 'menunggu']);
        $this->assertDatabaseHas('produk_lobster', ['id_produk' => $detail->id_produk, 'stok' => 1]);
    }

    public function test_guest_chat_is_private_and_admin_can_reply(): void
    {
        $session = $this->postJson('/api/konsultasi/mulai', ['nama' => 'Tamu Test', 'no_hp' => '6280000009999'])->assertCreated()->json('data');
        $path = '/api/konsultasi/'.$session['id_pelanggan'];
        $this->getJson($path)->assertNotFound();
        $this->withHeaders(['X-Chat-Token' => $session['token_konsultasi']])->postJson($path, ['isi_pesan' => 'Tanya stok', 'pengirim' => 'admin'])->assertCreated();
        $this->assertDatabaseHas('konsultasi', ['isi_pesan' => 'Tanya stok', 'pengirim' => 'pelanggan']);
        $admin = User::factory()->create();

        $this->actingAs($admin, 'sanctum')->postJson($path, ['isi_pesan' => 'Stok tersedia'])->assertCreated();

        $this->getJson($path)->assertOk()->assertJsonCount(2, 'data');
        $this->assertDatabaseHas('konsultasi', ['isi_pesan' => 'Stok tersedia', 'pengirim' => 'admin']);
    }

    public function test_customer_cannot_access_admin_orders_or_other_chat(): void
    {
        $buyer = $this->buyer();
        $otherId = DB::table('pelanggan')->where('no_hp', '6280000001002')->value('id_pelanggan');

        $this->actingAs($buyer, 'sanctum')->getJson('/api/pengelolaan/pesanan')->assertForbidden();
        $this->getJson('/api/pengelolaan/konsultasi')->assertForbidden();
        $this->getJson('/api/konsultasi/'.$otherId)->assertNotFound();
    }

    public function test_delivery_requires_paid_dp_and_customer_can_confirm_receipt(): void
    {
        $buyer = $this->buyer();
        $code = $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan', $this->payload())->json('data.kode_pesanan');
        $order = DB::table('pesanan')->first();
        DB::table('pesanan')->where('id_pesanan', $order->id_pesanan)->update(['status_penawaran' => 'diterima', 'status_pesanan' => 'menunggu_dp']);
        $admin = User::factory()->create();
        $this->actingAs($admin, 'sanctum')->postJson('/api/pengelolaan/pesanan/'.$code.'/pengiriman', ['kurir' => 'Test Kurir', 'no_resi' => 'TEST-1'])->assertConflict();
        DB::table('pembayaran')->insert(['id_pesanan' => $order->id_pesanan, 'jenis' => 'dp', 'jumlah' => 120000, 'status_bayar' => 'dibayar']);
        $this->postJson('/api/pengelolaan/pesanan/'.$code.'/pengiriman', ['kurir' => 'Test Kurir', 'no_resi' => 'TEST-1'])->assertOk();

        $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan/'.$code.'/diterima')->assertOk()->assertJsonPath('data.status_pesanan', 'menunggu_pelunasan');

        $this->assertDatabaseHas('pengiriman', ['id_pesanan' => $order->id_pesanan, 'status_pengiriman' => 'diterima']);
        $this->postJson('/api/pesanan/'.$code.'/diterima')->assertConflict();
    }

    public function test_rejecting_offer_does_not_reserve_stock(): void
    {
        $buyer = $this->buyer();
        $payload = $this->payload();
        $code = $this->actingAs($buyer, 'sanctum')->postJson('/api/pesanan', $payload)->json('data.kode_pesanan');
        DB::table('pesanan')->where('kode_pesanan', $code)->update(['status_penawaran' => 'menunggu', 'status_pesanan' => 'disetujui']);

        $this->postJson('/api/pesanan/'.$code.'/penawaran', ['keputusan' => 'ditolak', 'versi_penawaran' => 0])->assertOk()->assertJsonPath('data.status_pesanan', 'ditolak');

        $this->assertDatabaseHas('produk_lobster', ['id_produk' => $payload['items'][0]['id_produk'], 'stok' => 25.5]);
    }
}
