<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FirebaseGateway;
use App\Services\OrderAccess;
use App\Services\PaymentProofStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManualPaymentController extends Controller
{
    public function __construct(private OrderAccess $access, private PaymentProofStorage $storage, private FirebaseGateway $firebase) {}

    public function store(Request $request, string $code): JsonResponse
    {
        $this->access->authorize($request, $code);
        $data = $request->validate([
            'jenis' => 'required|in:dp,pelunasan', 'upload_key' => 'required|uuid',
            'bukti' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048|dimensions:max_width=4096,max_height=4096',
        ]);
        $result = DB::transaction(function () use ($request, $code, $data): array {
            $order = $this->access->authorize($request, $code, true);
            $duplicate = DB::table('pembayaran')->where('upload_key', $data['upload_key'])->first();
            if ($duplicate !== null) {
                abort_unless((int) $duplicate->id_pesanan === (int) $order->id_pesanan && $duplicate->jenis === $data['jenis'], 409, 'Kode unggahan tidak sesuai. Perbarui pesanan.');

                return ['id_pembayaran' => $duplicate->id_pembayaran, 'jumlah' => $duplicate->jumlah, 'status_bayar' => $duplicate->status_bayar];
            }
            $simulation = $this->access->simulation((int) $order->id_pesanan);
            abort_unless($this->storage->configured() && ($simulation || collect(config('services.transfer'))->every(fn ($value): bool => is_string($value) && trim($value) !== '')), 503, 'Pembayaran belum aktif. Admin perlu mengatur Storage dan rekening tujuan jika memakai transfer nyata.');
            abort_unless($order->status_penawaran === 'diterima' && ! in_array($order->status_pesanan, ['ditolak', 'lunas'], true), 409, 'Pesanan belum dapat dibayar atau sudah lunas.');
            abort_if(DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('status_bayar', 'menunggu')->exists(), 409, 'Masih ada pembayaran yang menunggu. Periksa pembayaran sebelumnya sebelum mengirim lagi.');
            $paid = (float) DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('status_bayar', 'dibayar')->sum('jumlah');
            $dpPaid = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('jenis', 'dp')->where('status_bayar', 'dibayar')->exists();
            abort_unless(($data['jenis'] === 'dp' && ! $dpPaid) || ($data['jenis'] === 'pelunasan' && $dpPaid), 409, 'Bayar DP terlebih dahulu, kemudian pelunasan.');
            $percent = max(1, min(99, (int) config('services.midtrans.dp_percent', 50)));
            $amount = $data['jenis'] === 'dp' ? (int) ceil((float) $order->total * $percent / 100) : (int) round((float) $order->total - $paid);
            abort_if($amount <= 0 || $amount + $paid > (float) $order->total, 409, 'Tagihan sudah dibayar. Perbarui pesanan.');
            $file = $request->file('bukti');
            $path = $order->id_pesanan.'/'.$data['upload_key'].'.'.$file->extension();
            $this->storage->upload($path, $file);
            $id = DB::table('pembayaran')->insertGetId([
                'id_pesanan' => $order->id_pesanan, 'jenis' => $data['jenis'], 'metode' => $simulation ? 'simulasi' : 'transfer_manual',
                'mata_uang' => 'IDR', 'jumlah' => $amount, 'status_bayar' => 'menunggu',
                'bukti_path' => $path, 'upload_key' => $data['upload_key'], 'created_at' => now(), 'updated_at' => now(),
            ], 'id_pembayaran');

            return ['id_pembayaran' => $id, 'jumlah' => $amount, 'status_bayar' => 'menunggu'];
        });

        return response()->json(['message' => 'Bukti dikirim. Tunggu verifikasi admin.', 'data' => $result]);
    }

    public function show(Request $request, string $code, int $payment): JsonResponse
    {
        $order = $this->access->authorize($request, $code);
        $proof = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('id_pembayaran', $payment)->first();
        abort_if($proof === null || $proof->bukti_path === null, 404, 'Bukti tidak ditemukan.');

        return response()->json(['data' => ['url' => $this->storage->signedUrl($proof->bukti_path)]]);
    }

    public function verify(Request $request, string $code, int $payment): JsonResponse
    {
        $data = $request->validate(['keputusan' => 'required|in:dibayar,ditolak', 'catatan' => 'nullable|required_if:keputusan,ditolak|string|max:2000']);
        DB::transaction(function () use ($request, $code, $payment, $data): void {
            $order = $this->access->authorize($request, $code, true);
            $proof = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('id_pembayaran', $payment)->lockForUpdate()->first();
            abort_if($proof === null || ! in_array($proof->metode, ['transfer_manual', 'simulasi'], true), 404, 'Pembayaran bukti tidak ditemukan.');
            if ($proof->status_bayar === $data['keputusan']) {
                return;
            }
            abort_unless($proof->status_bayar === 'menunggu', 409, 'Pembayaran sudah diverifikasi.');
            abort_unless($order->status_penawaran === 'diterima' && ! in_array($order->status_pesanan, ['ditolak', 'lunas'], true), 409, 'Status pesanan tidak dapat menerima pembayaran.');
            if ($data['keputusan'] === 'dibayar') {
                $paid = (float) DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('status_bayar', 'dibayar')->sum('jumlah');
                abort_if($paid + (float) $proof->jumlah > (float) $order->total, 409, 'Jumlah pembayaran melebihi tagihan. Perbarui pesanan.');
            }
            DB::table('pembayaran')->where('id_pembayaran', $payment)->update([
                'status_bayar' => $data['keputusan'], 'catatan_verifikasi' => $data['catatan'] ?? null,
                'diverifikasi_at' => now(), 'waktu_bayar' => $data['keputusan'] === 'dibayar' ? now() : null, 'updated_at' => now(),
            ]);
            if ($data['keputusan'] === 'dibayar') {
                $total = (float) DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('status_bayar', 'dibayar')->sum('jumlah');
                $status = $total >= (float) $order->total ? 'lunas' : 'dp_dibayar';
                if ($status !== 'lunas' && in_array($order->status_pesanan, ['diproses', 'dikirim', 'diterima', 'menunggu_pelunasan'], true)) {
                    $status = $order->status_pesanan;
                }
                DB::table('pesanan')->where('id_pesanan', $order->id_pesanan)->update(['status_pesanan' => $status, 'updated_at' => now()]);
            }
            $this->firebase->enqueue($code);
        });

        return response()->json(['message' => 'Verifikasi pembayaran disimpan.']);
    }
}
