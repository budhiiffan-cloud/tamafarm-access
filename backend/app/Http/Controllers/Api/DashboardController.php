<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        // 1. Pesanan Baru (total pesanan yang masih aktif / baru masuk)
        $pesananBaru = DB::table('pesanan')
            ->whereIn('status_pesanan', ['menunggu_persetujuan', 'disetujui', 'menunggu_dp', 'dp_dibayar', 'diproses'])
            ->count();

        // 2. Menunggu Persetujuan
        $menungguPersetujuan = DB::table('pesanan')
            ->where('status_pesanan', 'menunggu_persetujuan')
            ->count();

        // 3. Penawaran Aktif (status penawaran menunggu dari pembeli)
        $penawaranAktif = DB::table('pesanan')
            ->where('status_penawaran', 'menunggu')
            ->count();

        // 4. Penjualan Bulan Ini (total transaksi yang sah/berlangsung bulan ini)
        $now = Carbon::now();
        $penjualanBulanIni = (float) DB::table('pesanan')
            ->whereYear('tanggal', $now->year)
            ->whereMonth('tanggal', $now->month)
            ->whereNotIn('status_pesanan', ['dibatalkan', 'ditolak'])
            ->sum('total');

        $formatJt = function (float $amount): string {
            if ($amount <= 0) {
                return 'Rp 0';
            }
            if ($amount >= 1000000000) {
                return 'Rp '.number_format($amount / 1000000000, 1, ',', '.').' M';
            }
            if ($amount >= 1000000) {
                return 'Rp '.number_format($amount / 1000000, 1, ',', '.').' jt';
            }

            return 'Rp '.number_format($amount, 0, ',', '.');
        };

        // 5. Penjualan 7 Hari Terakhir (Dihitung riil dari database per hari)
        $penjualan7Hari = [];
        $maxDaily = 0;

        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dateStr = $date->toDateString();

            $dayTotal = (float) DB::table('pesanan')
                ->whereDate('tanggal', $dateStr)
                ->whereNotIn('status_pesanan', ['dibatalkan', 'ditolak'])
                ->sum('total');

            if ($dayTotal > $maxDaily) {
                $maxDaily = $dayTotal;
            }

            $dayOfWeek = $date->dayOfWeek; // 0 = Min, 1 = Sen, ...
            $dayShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][$dayOfWeek];
            $dayLong = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][$dayOfWeek];

            $penjualan7Hari[] = [
                'hari' => $dayShort,
                'label' => $dayLong.' ('.$date->format('d/m').')',
                'date' => $dateStr,
                'total' => $dayTotal,
                'tinggi_persen' => 0,
            ];
        }

        // Hitung proporsi persentase tinggi bar grafik
        foreach ($penjualan7Hari as &$day) {
            if ($maxDaily > 0 && $day['total'] > 0) {
                $day['tinggi_persen'] = max(10, (int) round(($day['total'] / $maxDaily) * 100));
            } else {
                $day['tinggi_persen'] = 0;
            }
        }
        unset($day);

        // 6. Pesanan Terbaru (Riil dari database)
        $rawPesanan = DB::table('pesanan')
            ->orderByDesc('id_pesanan')
            ->limit(5)
            ->get();

        $pesananTerbaru = [];
        foreach ($rawPesanan as $p) {
            $statusText = 'Menunggu';
            $statusColor = 'text-[#f59e0b]';

            if ($p->status_pesanan === 'menunggu_persetujuan') {
                $statusText = 'Menunggu';
                $statusColor = 'text-[#f59e0b]';
            } elseif ($p->status_pesanan === 'disetujui' && $p->status_penawaran === 'menunggu') {
                $statusText = 'Penawaran';
                $statusColor = 'text-[#10b981]';
            } elseif ($p->status_pesanan === 'disetujui') {
                $statusText = 'Disetujui';
                $statusColor = 'text-[#d97706]';
            } elseif (in_array($p->status_pesanan, ['dp_dibayar', 'lunas'], true)) {
                $statusText = 'Dibayar';
                $statusColor = 'text-[#16a34a]';
            } elseif ($p->status_pesanan === 'dikirim') {
                $statusText = 'Dikirim';
                $statusColor = 'text-[#0d9488]';
            } elseif ($p->status_pesanan === 'menunggu_pelunasan') {
                $statusText = 'Menunggu Pelunasan';
                $statusColor = 'text-[#d97706]';
            } elseif ($p->status_pesanan === 'diterima') {
                $statusText = 'Selesai';
                $statusColor = 'text-[#10b981]';
            } elseif (in_array($p->status_pesanan, ['ditolak', 'dibatalkan'], true)) {
                $statusText = 'Dibatalkan';
                $statusColor = 'text-[#ef4444]';
            }

            $pesananTerbaru[] = [
                'kode_pesanan' => $p->kode_pesanan,
                'status_pesanan' => $p->status_pesanan,
                'status_penawaran' => $p->status_penawaran,
                'status_text' => $statusText,
                'status_color' => $statusColor,
                'total' => (float) $p->total,
                'tanggal' => $p->tanggal,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'ringkasan' => [
                    'pesanan_baru' => $pesananBaru,
                    'menunggu_persetujuan' => $menungguPersetujuan,
                    'penawaran_aktif' => $penawaranAktif,
                    'penjualan_bulan_ini_raw' => $penjualanBulanIni,
                    'penjualan_bulan_ini' => $formatJt($penjualanBulanIni),
                ],
                'penjualan_7_hari' => $penjualan7Hari,
                'pesanan_terbaru' => $pesananTerbaru,
            ],
        ]);
    }
}
