<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PelangganSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /** @var list<array{username: string, nama: string, no_hp: string, alamat: string, negara: string, tipe_pembeli: string}> $pelanggans */
        $pelanggans = [
            [
                'username' => 'pembeli_andi',
                'nama' => 'Demo Pembeli Andi',
                'no_hp' => '6280000001001',
                'alamat' => 'Alamat demo, Bandung',
                'negara' => 'Indonesia',
                'tipe_pembeli' => 'perorangan',
            ],
            [
                'username' => 'pembeli_sari',
                'nama' => 'Demo Pembeli Sari',
                'no_hp' => '6280000001002',
                'alamat' => 'Alamat demo, Surabaya',
                'negara' => 'Indonesia',
                'tipe_pembeli' => 'perorangan',
            ],
            [
                'username' => 'restoran_bahari',
                'nama' => 'Demo Restoran Bahari',
                'no_hp' => '6280000001003',
                'alamat' => 'Alamat demo restoran, Jakarta',
                'negara' => 'Indonesia',
                'tipe_pembeli' => 'restoran',
            ],
            [
                'username' => 'restoran_laut_biru',
                'nama' => 'Demo Restoran Laut Biru',
                'no_hp' => '6280000001004',
                'alamat' => 'Alamat demo restoran, Denpasar',
                'negara' => 'Indonesia',
                'tipe_pembeli' => 'restoran',
            ],
            [
                'username' => 'singapore_seafood',
                'nama' => 'Demo Singapore Seafood',
                'no_hp' => '6500001005',
                'alamat' => 'Alamat demo importir, Singapore',
                'negara' => 'Singapura',
                'tipe_pembeli' => 'luar_negeri',
            ],
            [
                'username' => 'malaysia_seafood',
                'nama' => 'Demo Malaysia Seafood',
                'no_hp' => '6000001006',
                'alamat' => 'Alamat demo importir, Kuala Lumpur',
                'negara' => 'Malaysia',
                'tipe_pembeli' => 'luar_negeri',
            ],
        ];

        DB::transaction(function () use ($pelanggans): void {
            foreach ($pelanggans as $pelanggan) {
                $user = User::firstOrCreate(['username' => $pelanggan['username']], [
                    'nama' => $pelanggan['nama'],
                    'password' => 'password',
                    'role' => 'pelanggan',
                ]);

                if ($user->role !== 'pelanggan') {
                    throw new \RuntimeException('Username demo pelanggan sudah digunakan oleh akun dengan role lain.');
                }

                unset($pelanggan['username']);

                $existingPelanggan = DB::table('pelanggan')->where('no_hp', $pelanggan['no_hp'])->first();

                if ($existingPelanggan === null) {
                    DB::table('pelanggan')->insert(array_merge($pelanggan, [
                        'id_user' => $user->id_user,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]));
                } elseif ($existingPelanggan->id_user === null) {
                    DB::table('pelanggan')->where('id_pelanggan', $existingPelanggan->id_pelanggan)
                        ->update(['id_user' => $user->id_user, 'updated_at' => now()]);
                } elseif ((int) $existingPelanggan->id_user !== (int) $user->id_user) {
                    throw new \RuntimeException('Pelanggan demo sudah terhubung ke akun lain.');
                }
            }
        });
    }
}
