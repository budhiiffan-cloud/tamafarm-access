<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PelangganSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class PelangganAccountTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[TestWith(['pembeli_andi'])]
    #[TestWith(['pembeli_sari'])]
    #[TestWith(['restoran_bahari'])]
    #[TestWith(['restoran_laut_biru'])]
    #[TestWith(['singapore_seafood'])]
    #[TestWith(['malaysia_seafood'])]
    public function test_seeded_customer_can_login_and_access_own_account(string $username): void
    {
        $this->seed(PelangganSeeder::class);

        $response = $this->postJson('/api/login', ['username' => $username, 'password' => 'password']);

        $response->assertOk()->assertJsonPath('data.user.role', 'pelanggan')
            ->assertJsonPath('data.user.username', $username)
            ->assertJsonMissingPath('data.user.password');
        $this->assertDatabaseHas('pelanggan', ['id_user' => $response->json('data.user.id_user')]);
        $this->withToken($response->json('data.token'))->getJson('/api/me')
            ->assertOk()->assertJsonPath('data.username', $username);
    }

    #[TestWith(['POST', '/api/produk'])]
    #[TestWith(['GET', '/api/admin'])]
    public function test_customer_receives_403_for_staff_features(string $method, string $path): void
    {
        $this->seed(PelangganSeeder::class);
        $user = User::where('username', 'pembeli_andi')->firstOrFail();

        $this->actingAs($user)->json($method, $path)->assertForbidden();
    }

    public function test_reseeding_preserves_customer_password_and_profile_without_duplicates(): void
    {
        $this->seed(PelangganSeeder::class);
        $user = User::where('username', 'pembeli_andi')->firstOrFail();
        $user->update(['password' => 'password-baru']);
        DB::table('pelanggan')->where('id_user', $user->id_user)->update(['alamat' => 'Alamat diperbarui']);

        $this->seed(PelangganSeeder::class);

        $this->assertDatabaseCount('users', 6);
        $this->assertDatabaseCount('pelanggan', 6);
        $this->assertTrue(Hash::check('password-baru', $user->fresh()->password));
        $this->assertDatabaseHas('pelanggan', ['id_user' => $user->id_user, 'alamat' => 'Alamat diperbarui']);
    }

    public function test_customer_receives_401_for_incorrect_password(): void
    {
        $this->seed(PelangganSeeder::class);

        $this->postJson('/api/login', ['username' => 'pembeli_andi', 'password' => 'salah'])
            ->assertUnauthorized();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_customer_can_register_new_account(): void
    {
        $payload = [
            'nama' => 'Budi Santoso',
            'username' => 'budi_santoso',
            'password' => 'password123',
            'no_hp' => '081298765432',
        ];

        $response = $this->postJson('/api/register', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.user.username', 'budi_santoso')
            ->assertJsonPath('data.user.role', 'pelanggan');

        $this->assertDatabaseHas('users', ['username' => 'budi_santoso', 'role' => 'pelanggan']);
        $this->assertDatabaseHas('pelanggan', ['nama' => 'Budi Santoso']);
    }
}
