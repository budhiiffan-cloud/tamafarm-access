<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PelangganSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BuyerOrderGroupsTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function buyer(): User
    {
        $this->seed(PelangganSeeder::class);

        return User::where('username', 'pembeli_andi')->firstOrFail();
    }

    private function order(User $buyer, string $status, int $number): string
    {
        $code = 'TF-'.str_pad((string) $number, 12, '0', STR_PAD_LEFT);
        DB::table('pesanan')->insert([
            'kode_pesanan' => $code,
            'id_pelanggan' => DB::table('pelanggan')->where('id_user', $buyer->id_user)->value('id_pelanggan'),
            'tanggal' => now(), 'status_pesanan' => $status, 'total' => 120000,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return $code;
    }

    public function test_active_completed_and_cancelled_orders_are_separated_and_private(): void
    {
        $buyer = $this->buyer();
        $active = $this->order($buyer, 'menunggu_pelunasan', 1);
        $done = $this->order($buyer, 'lunas', 2);
        $cancelled = $this->order($buyer, 'dibatalkan', 3);
        $rejected = $this->order($buyer, 'ditolak', 4);
        $other = User::where('username', 'pembeli_sari')->firstOrFail();
        $this->order($other, 'lunas', 5);
        $this->actingAs($buyer, 'sanctum');

        $this->getJson('/api/pembeli/pesanan?kategori=aktif')->assertOk()
            ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.kode_pesanan', $active);
        $this->getJson('/api/pembeli/pesanan?kategori=selesai')->assertOk()
            ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.kode_pesanan', $done);
        $this->getJson('/api/pembeli/pesanan?kategori=dibatalkan')->assertOk()
            ->assertJsonPath('data.total', 2)->assertJsonPath('data.data.0.kode_pesanan', $rejected)->assertJsonPath('data.data.1.kode_pesanan', $cancelled);
        $this->getJson('/api/pembeli/pesanan')->assertOk()->assertJsonPath('data.total', 4);
    }

    public function test_completed_filter_is_applied_before_pagination(): void
    {
        $buyer = $this->buyer();
        for ($number = 1; $number <= 21; $number++) {
            $this->order($buyer, 'lunas', $number);
        }
        $this->order($buyer, 'menunggu_dp', 22);
        $this->actingAs($buyer, 'sanctum')->getJson('/api/pembeli/pesanan?kategori=selesai&page=2')
            ->assertOk()->assertJsonPath('data.total', 21)->assertJsonPath('data.last_page', 2)
            ->assertJsonCount(1, 'data.data')->assertJsonPath('data.data.0.kode_pesanan', 'TF-000000000001');
    }

    public function test_invalid_category_is_rejected_and_session_is_required(): void
    {
        $buyer = $this->buyer();
        $this->getJson('/api/pembeli/pesanan?kategori=selesai')->assertUnauthorized();
        $this->actingAs($buyer, 'sanctum')->getJson('/api/pembeli/pesanan?kategori=unknown')
            ->assertUnprocessable()->assertJsonValidationErrors('kategori');

    }
}
