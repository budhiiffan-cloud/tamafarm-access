<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class StaffAccessTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_production_seed_creates_only_owner_and_preserves_existing_password(): void
    {
        $this->assertDatabaseCount('users', 0);
        app()->detectEnvironment(fn () => 'production');
        config(['services.bootstrap_owner_password' => 'test-owner-password-only']);
        $this->artisan('db:seed', ['--force' => true])->assertExitCode(0);
        $owner = User::where('username', 'pemilik')->firstOrFail();
        $this->assertTrue(Hash::check('test-owner-password-only', $owner->password));
        config(['services.bootstrap_owner_password' => 'different-test-password']);
        $this->artisan('db:seed', ['--force' => true])->assertExitCode(0);
        $this->assertSame($owner->password, $owner->fresh()->password);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_production_password_recovery_cannot_change_an_account(): void
    {
        $user = User::factory()->create(['role' => 'pemilik']);
        app()->detectEnvironment(fn () => 'production');

        $this->postJson('/api/lupa-password', ['username' => $user->username, 'password_baru' => 'unauthorized-change'])
            ->assertStatus(503);
        $this->assertSame($user->password, $user->fresh()->password);
    }

    #[TestWith(['/api/pengelolaan/laporan'])]
    #[TestWith(['/api/pengelolaan/pelanggan'])]
    #[TestWith(['/api/pengelolaan/pelanggan/1/pesanan'])]
    public function test_customer_cannot_read_staff_reports_or_customer_data(string $path): void
    {
        $this->getJson($path)->assertUnauthorized();
        $user = User::factory()->create(['role' => 'pelanggan']);
        $this->actingAs($user, 'sanctum')->getJson($path)->assertForbidden();
    }

    #[TestWith(['admin'])]
    #[TestWith(['pemilik'])]
    public function test_staff_can_search_customer_data_and_read_empty_history(string $role): void
    {
        $customer = DB::table('pelanggan')->insertGetId([
            'nama' => 'Pelanggan Uji', 'no_hp' => '08123456789', 'tipe_pembeli' => 'perorangan',
            'created_at' => now(), 'updated_at' => now(),
        ], 'id_pelanggan');
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user, 'sanctum')->getJson('/api/pengelolaan/pelanggan?q=081234')
            ->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.jumlah_pesanan', 0);
        $this->getJson('/api/pengelolaan/pelanggan?q=tidak-ada')->assertOk()->assertJsonPath('data.total', 0);
        $this->getJson('/api/pengelolaan/pelanggan/'.$customer.'/pesanan')->assertOk()->assertExactJson(['data' => []]);
        $this->getJson('/api/pengelolaan/pelanggan/999999/pesanan')->assertNotFound();
        $this->getJson('/api/pengelolaan/laporan')->assertOk()->assertExactJson(['data' => []]);
    }

    #[TestWith(['admin'])]
    #[TestWith(['pemilik'])]
    public function test_staff_can_read_transaction_list_for_reports(string $role): void
    {
        $user = User::factory()->create(['role' => $role]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/pengelolaan/pesanan');

        $response->assertOk()->assertJsonStructure(['data' => ['data', 'current_page', 'total']]);
    }

    public function test_transaction_list_returns_401_without_login(): void
    {
        $this->getJson('/api/pengelolaan/pesanan')->assertUnauthorized();
    }

    public function test_report_and_customer_history_include_orders_beyond_first_page(): void
    {
        $customer = DB::table('pelanggan')->insertGetId([
            'nama' => 'Pembeli Laporan', 'no_hp' => '08111111111', 'tipe_pembeli' => 'perorangan',
            'created_at' => now(), 'updated_at' => now(),
        ], 'id_pelanggan');
        for ($i = 1; $i <= 21; $i++) {
            DB::table('pesanan')->insert([
                'kode_pesanan' => 'REPORT-'.$i, 'id_pelanggan' => $customer, 'tanggal' => now(),
                'total' => 100000, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $other = DB::table('pelanggan')->insertGetId([
            'nama' => 'Pembeli Lain', 'no_hp' => '08222222222', 'tipe_pembeli' => 'perorangan',
            'created_at' => now(), 'updated_at' => now(),
        ], 'id_pelanggan');
        $user = User::factory()->create(['role' => 'pemilik']);

        $this->actingAs($user, 'sanctum')->getJson('/api/pengelolaan/laporan')
            ->assertOk()->assertJsonCount(21, 'data')->assertJsonPath('data.20.kode_pesanan', 'REPORT-1');
        $this->getJson('/api/pengelolaan/pelanggan/'.$customer.'/pesanan')->assertOk()->assertJsonCount(21, 'data');
        $this->getJson('/api/pengelolaan/pelanggan/'.$other.'/pesanan')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_transaction_list_returns_403_for_customer(): void
    {
        $user = User::factory()->create(['role' => 'pelanggan']);

        $this->actingAs($user, 'sanctum')->getJson('/api/pengelolaan/pesanan')->assertForbidden();
    }

    #[TestWith(['POST', '/api/produk'])]
    #[TestWith(['POST', '/api/kategori'])]
    #[TestWith(['GET', '/api/pengelolaan/pesanan/AUDIT-ORDER'])]
    #[TestWith(['POST', '/api/pengelolaan/pesanan/AUDIT-ORDER/penawaran'])]
    #[TestWith(['POST', '/api/pengelolaan/pesanan/AUDIT-ORDER/tolak'])]
    #[TestWith(['POST', '/api/pengelolaan/pesanan/AUDIT-ORDER/pengiriman'])]
    #[TestWith(['POST', '/api/pengelolaan/pesanan/AUDIT-ORDER/pembayaran/1/verifikasi'])]
    #[TestWith(['GET', '/api/pengelolaan/konsultasi'])]
    public function test_admin_operations_return_403_for_owner(string $method, string $path): void
    {
        $user = User::factory()->create(['role' => 'pemilik']);

        $this->actingAs($user, 'sanctum')->json($method, $path)->assertForbidden();

        $this->assertDatabaseCount('produk_lobster', 0);
        $this->assertDatabaseCount('kategori', 0);
        $this->assertDatabaseCount('pesanan', 0);
        $this->assertDatabaseCount('pembayaran', 0);
        $this->assertDatabaseCount('pengiriman', 0);
    }
}
