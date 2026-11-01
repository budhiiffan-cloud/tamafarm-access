<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            if (User::where('username', 'pemilik')->exists()) {
                return;
            }
            $password = (string) config('services.bootstrap_owner_password');
            if (strlen($password) < 12) {
                throw new \RuntimeException('Isi BOOTSTRAP_OWNER_PASSWORD minimal 12 karakter di Render.');
            }
            User::create(['nama' => 'Pemilik', 'username' => 'pemilik', 'password' => $password, 'role' => 'pemilik']);

            return;
        }
        User::firstOrCreate(['username' => 'pemilik'], [
            'nama' => 'Pemilik',
            'username' => 'pemilik',
            'password' => 'password',
            'role' => 'pemilik',
        ]);

        $this->call([
            KatalogProdukSeeder::class,
            PelangganSeeder::class,
        ]);
    }
}
