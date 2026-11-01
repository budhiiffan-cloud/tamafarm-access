<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\KatalogProdukSeeder;
use Database\Seeders\PelangganSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class DeliveryLocationTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function payload(array $location = []): array
    {
        config(['services.firebase.enabled' => false]);
        $this->seed([PelangganSeeder::class, KatalogProdukSeeder::class]);

        return array_merge([
            'nama' => 'Penerima Pesanan', 'no_hp' => '6280000009999',
            'alamat' => 'Alamat tujuan pesanan', 'negara' => 'Indonesia', 'tipe_pembeli' => 'perorangan',
            'items' => [['id_produk' => DB::table('produk_lobster')->where('nama_produk', 'Lobster Air Tawar Small')->value('id_produk'), 'jumlah' => 1]],
        ], $location);
    }

    #[TestWith([-6.917464, 107.619123])]
    #[TestWith([0, 0])]
    public function test_coordinates_are_saved_with_order_and_readable_by_owner_and_admin(float $latitude, float $longitude): void
    {
        $payload = $this->payload(compact('latitude', 'longitude'));
        $buyer = User::where('username', 'pembeli_andi')->firstOrFail();
        $code = $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/pesanan', $payload)->assertCreated()->json('data.kode_pesanan');
        $stored = json_decode(DB::table('pesanan')->where('kode_pesanan', $code)->value('data_pengiriman'), true);
        $this->assertEquals($latitude, $stored['latitude']);
        $this->assertEquals($longitude, $stored['longitude']);
        $this->assertSame('Alamat tujuan pesanan', $stored['alamat']);
        $this->getJson('/api/pembeli/pesanan/'.$code)->assertOk()->assertJsonPath('data.data_pengiriman.alamat', 'Alamat tujuan pesanan');
        $this->actingAs(User::factory()->create(), 'sanctum')->getJson('/api/pengelolaan/pesanan/'.$code)
            ->assertOk()->assertJsonPath('data.data_pengiriman.latitude', $stored['latitude']);
        $other = User::where('username', 'pembeli_sari')->firstOrFail();
        $this->actingAs($other, 'sanctum')->getJson('/api/pembeli/pesanan/'.$code)->assertNotFound();
    }

    public function test_address_only_checkout_still_succeeds(): void
    {
        $payload = $this->payload();
        $buyer = User::where('username', 'pembeli_andi')->firstOrFail();
        $code = $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/pesanan', $payload)->assertCreated()->json('data.kode_pesanan');
        $this->getJson('/api/pembeli/pesanan/'.$code)->assertOk()->assertJsonMissingPath('data.data_pengiriman.latitude');
    }

    #[TestWith([['latitude' => -6], 'longitude'])]
    #[TestWith([['longitude' => 107], 'latitude'])]
    #[TestWith([['latitude' => 91, 'longitude' => 107], 'latitude'])]
    #[TestWith([['latitude' => -6, 'longitude' => -181], 'longitude'])]
    #[TestWith([['latitude' => 'invalid', 'longitude' => 107], 'latitude'])]
    public function test_invalid_or_incomplete_coordinates_return_422(array $location, string $field): void
    {
        $payload = $this->payload($location);
        $buyer = User::where('username', 'pembeli_andi')->firstOrFail();
        $this->actingAs($buyer, 'sanctum')->postJson('/api/pembeli/pesanan', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('pesanan', 0);
    }
}
