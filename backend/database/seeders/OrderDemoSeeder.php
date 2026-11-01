<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrderDemoSeeder extends Seeder
{
    public function run(): void
    {
        $customers = DB::table('pelanggan')->pluck('id_pelanggan')->toArray();
        if (empty($customers)) {
            return;
        }

        $products = DB::table('produk_lobster')->get()->keyBy('id_produk');
        if ($products->isEmpty()) {
            return;
        }

        $orders = [
            [
                'kode' => 'ORD-0017',
                'id_pelanggan' => $customers[0],
                'status_pesanan' => 'dikirim',
                'status_penawaran' => 'diterima',
                'total' => 18500000,
                'biaya_pengiriman' => 150000,
                'created_at' => now()->subDays(6),
                'kurir' => 'JNE Cargo',
                'resi' => 'JNE-TM-998811',
            ],
            [
                'kode' => 'ORD-0018',
                'id_pelanggan' => $customers[1 % count($customers)],
                'status_pesanan' => 'dp_dibayar',
                'status_penawaran' => 'diterima',
                'total' => 12000000,
                'biaya_pengiriman' => 100000,
                'created_at' => now()->subDays(4),
                'kurir' => null,
                'resi' => null,
            ],
            [
                'kode' => 'ORD-0019',
                'id_pelanggan' => $customers[2 % count($customers)],
                'status_pesanan' => 'disetujui',
                'status_penawaran' => 'menunggu',
                'total' => 7800000,
                'biaya_pengiriman' => 75000,
                'created_at' => now()->subDays(2),
                'kurir' => null,
                'resi' => null,
            ],
            [
                'kode' => 'ORD-0020',
                'id_pelanggan' => $customers[3 % count($customers)],
                'status_pesanan' => 'disetujui',
                'status_penawaran' => null,
                'total' => 5500000,
                'biaya_pengiriman' => 50000,
                'created_at' => now()->subDay(),
                'kurir' => null,
                'resi' => null,
            ],
            [
                'kode' => 'ORD-0021',
                'id_pelanggan' => $customers[0],
                'status_pesanan' => 'menunggu_persetujuan',
                'status_penawaran' => null,
                'total' => 2400000,
                'biaya_pengiriman' => 0,
                'created_at' => now(),
                'kurir' => null,
                'resi' => null,
            ],
        ];

        // Tambah beberapa pesanan lama agar total pesanan dan status penawaran sesuai
        for ($i = 1; $i <= 16; $i++) {
            $code = sprintf('ORD-%04d', $i);
            $statusPesanan = $i <= 6 ? 'menunggu_persetujuan' : ($i <= 12 ? 'disetujui' : 'lunas');
            $statusPenawaran = $i <= 12 ? 'menunggu' : 'diterima';
            $orders[] = [
                'kode' => $code,
                'id_pelanggan' => $customers[$i % count($customers)],
                'status_pesanan' => $statusPesanan,
                'status_penawaran' => $statusPenawaran,
                'total' => rand(15, 65) * 100000,
                'biaya_pengiriman' => 50000,
                'created_at' => now()->subDays(rand(1, 25)),
                'kurir' => null,
                'resi' => null,
            ];
        }

        foreach ($orders as $data) {
            $exists = DB::table('pesanan')->where('kode_pesanan', $data['kode'])->first();
            if ($exists) {
                continue;
            }

            $orderId = DB::table('pesanan')->insertGetId([
                'kode_pesanan' => $data['kode'],
                'id_pelanggan' => $data['id_pelanggan'],
                'tanggal' => $data['created_at'],
                'status_pesanan' => $data['status_pesanan'],
                'status_penawaran' => $data['status_penawaran'],
                'mata_uang' => 'IDR',
                'total' => $data['total'],
                'biaya_pengiriman' => $data['biaya_pengiriman'],
                'versi_penawaran' => 1,
                'catatan' => 'Pesanan demonstrasi untuk dashboard',
                'data_pengiriman' => json_encode([
                    'nama' => 'Pelanggan '.$data['kode'],
                    'no_hp' => '081234567890',
                    'alamat' => 'Jl. Demonstrasi No. '.substr($data['kode'], -2),
                    'negara' => 'Indonesia',
                    'tipe_pembeli' => 'perorangan',
                ]),
                'created_at' => $data['created_at'],
                'updated_at' => $data['created_at'],
            ]);

            // Insert 1 detail pesanan
            $firstProduct = $products->first();
            DB::table('detail_pesanan')->insert([
                'id_pesanan' => $orderId,
                'id_produk' => $firstProduct->id_produk,
                'nama_produk' => $firstProduct->nama_produk,
                'satuan' => $firstProduct->satuan,
                'jumlah' => 2,
                'harga_satuan' => (int) ($data['total'] / 2),
                'subtotal' => $data['total'],
                'created_at' => $data['created_at'],
                'updated_at' => $data['created_at'],
            ]);

            if ($data['resi']) {
                DB::table('pengiriman')->insert([
                    'id_pesanan' => $orderId,
                    'kurir' => $data['kurir'],
                    'no_resi' => $data['resi'],
                    'status_pengiriman' => 'dikirim',
                    'tanggal_kirim' => now()->toDateString(),
                    'created_at' => $data['created_at'],
                    'updated_at' => $data['created_at'],
                ]);
            }
        }
    }
}
