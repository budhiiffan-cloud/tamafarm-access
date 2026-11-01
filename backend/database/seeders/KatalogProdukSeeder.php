<?php

namespace Database\Seeders;

use App\Models\Kategori;
use App\Models\ProdukLobster;
use Illuminate\Database\Seeder;

class KatalogProdukSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $lobsterHidup = Kategori::firstOrCreate(
            ['nama_kategori' => 'Lobster Hidup'],
            ['deskripsi' => 'Lobster hidup dijual per kg'],
        );
        $paketKemitraan = Kategori::firstOrCreate(
            ['nama_kategori' => 'Paket Kemitraan'],
            ['deskripsi' => 'Paket Pemula dan Paket Farmer'],
        );

        /** @var list<array{nama_produk: string, ukuran: string, harga: int, stok: float, moq_restoran: int, moq_luar_negeri: int}> $lobsters */
        $lobsters = [
            ['nama_produk' => 'Lobster Air Tawar Small', 'ukuran' => '30-50 gram/ekor', 'harga' => 120000, 'stok' => 25.5, 'moq_restoran' => 2, 'moq_luar_negeri' => 20],
            ['nama_produk' => 'Lobster Air Tawar Medium', 'ukuran' => '50-80 gram/ekor', 'harga' => 150000, 'stok' => 40.0, 'moq_restoran' => 2, 'moq_luar_negeri' => 20],
            ['nama_produk' => 'Lobster Air Tawar Large', 'ukuran' => '80-120 gram/ekor', 'harga' => 185000, 'stok' => 30.0, 'moq_restoran' => 3, 'moq_luar_negeri' => 25],
            ['nama_produk' => 'Lobster Air Tawar Jumbo', 'ukuran' => '120-150 gram/ekor', 'harga' => 220000, 'stok' => 15.5, 'moq_restoran' => 3, 'moq_luar_negeri' => 25],
            ['nama_produk' => 'Lobster Air Tawar Super Jumbo', 'ukuran' => '150-200 gram/ekor', 'harga' => 260000, 'stok' => 10.0, 'moq_restoran' => 5, 'moq_luar_negeri' => 30],
            ['nama_produk' => 'Lobster Air Tawar Premium', 'ukuran' => '>200 gram/ekor', 'harga' => 300000, 'stok' => 0.0, 'moq_restoran' => 5, 'moq_luar_negeri' => 30],
        ];

        foreach ($lobsters as $lobster) {
            ProdukLobster::firstOrCreate(
                ['id_kategori' => $lobsterHidup->id_kategori, 'nama_produk' => $lobster['nama_produk']],
                array_merge($lobster, [
                    'satuan' => 'kg',
                    'deskripsi' => 'Contoh produk katalog: lobster air tawar hidup untuk kebutuhan restoran dan pembelian grosir. Harga dan stok merupakan data demo.',
                    'harga_usd' => null,
                    'gambar' => null,
                ]),
            );
        }

        /** @var list<array{nama_produk: string, deskripsi: string, ukuran: string, harga: int, stok: int}> $packages */
        $packages = [
            [
                'nama_produk' => 'Paket Kemitraan Pemula',
                'deskripsi' => 'Contoh paket untuk mulai belajar budidaya: 100 ekor bibit lobster air tawar, pakan awal, dan panduan perawatan. Isi paket dan harga merupakan data demo.',
                'ukuran' => '100 ekor bibit/paket',
                'harga' => 750000,
                'stok' => 12,
            ],
            [
                'nama_produk' => 'Paket Kemitraan Farmer',
                'deskripsi' => 'Contoh paket untuk pengembangan budidaya: 500 ekor bibit lobster air tawar, pakan awal, dan panduan pemeliharaan. Isi paket dan harga merupakan data demo.',
                'ukuran' => '500 ekor bibit/paket',
                'harga' => 3250000,
                'stok' => 5,
            ],
        ];

        foreach ($packages as $package) {
            ProdukLobster::firstOrCreate(
                ['id_kategori' => $paketKemitraan->id_kategori, 'nama_produk' => $package['nama_produk']],
                array_merge($package, [
                    'satuan' => 'paket',
                    'harga_usd' => null,
                    'moq_restoran' => null,
                    'moq_luar_negeri' => null,
                    'gambar' => null,
                ]),
            );
        }

        $gambarProduk = [
            'Lobster Air Tawar Small' => 'istockphoto-1028870058-612x612.jpg',
            'Lobster Air Tawar Medium' => 'lobster mutiara.png',
            'Lobster Air Tawar Large' => 'OIP (1).jpg',
            'Lobster Air Tawar Jumbo' => 'OIP.jpg',
            'Lobster Air Tawar Super Jumbo' => 'OIPp.jpg',
            'Lobster Air Tawar Premium' => 'PNG-Torres-Strait-Lobster6_Credit-MHidalgoFIA-2023_912.jpg',
            'Paket Kemitraan Pemula' => 'thumb-1920-2108.jpg',
            'Paket Kemitraan Farmer' => 'udang-lobster-laut-23-66cf13f734777c51b853c452.jpg',
        ];

        foreach ($gambarProduk as $namaProduk => $namaFile) {
            $gambarKatalog = 'produk/'.$namaFile;

            if (! is_file(storage_path('app/public/'.$gambarKatalog))) {
                continue;
            }

            ProdukLobster::where('nama_produk', $namaProduk)
                ->where(function ($query): void {
                    $query->whereNull('gambar')->orWhere('gambar', 'produk/OIP.jpg');
                })
                ->update(['gambar' => $gambarKatalog]);
        }
    }
}
