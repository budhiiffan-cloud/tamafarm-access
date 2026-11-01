<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FirebaseGateway;
use App\Services\OrderAccess;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(private OrderAccess $access, private FirebaseGateway $firebase) {}

    private function serverKey(): string
    {
        $key = (string) config('services.midtrans.server_key');
        abort_if($key === '', 503, 'Pembayaran belum aktif. Admin perlu mengisi MIDTRANS_SERVER_KEY Sandbox.');

        return $key;
    }

    private function remoteStatus(string $transaction): ?array
    {
        try {
            $response = Http::withBasicAuth($this->serverKey(), '')->acceptJson()->connectTimeout(5)->timeout(15)
                ->get('https://api.sandbox.midtrans.com/v2/'.rawurlencode($transaction).'/status');
        } catch (ConnectionException) {
            abort(502, 'Midtrans belum dapat dihubungi. Coba lagi nanti.');
        }
        if ($response->status() === 404 || $response->json('status_code') === '404') {
            return null;
        }
        abort_unless($response->successful() && is_array($response->json()), 502, 'Gagal memeriksa status pembayaran.');

        return $response->json();
    }

    private function applyStatus(string $transaction, array $status): void
    {
        DB::transaction(function () use ($transaction, $status): void {
            $payment = DB::table('pembayaran')->where('id_transaksi', $transaction)->first();
            abort_if($payment === null, 404);
            $order = DB::table('pesanan')->where('id_pesanan', $payment->id_pesanan)->lockForUpdate()->first();
            $payment = DB::table('pembayaran')->where('id_pembayaran', $payment->id_pembayaran)->lockForUpdate()->first();
            abort_unless(($status['order_id'] ?? null) === $transaction && isset($status['gross_amount']) && (float) $status['gross_amount'] === (float) $payment->jumlah && ($status['currency'] ?? 'IDR') === 'IDR', 422, 'Detail pembayaran tidak cocok dengan pesanan.');
            if ($payment->status_bayar === 'dibayar') {
                return;
            }
            $state = $status['transaction_status'] ?? '';
            $paid = in_array($state, ['settlement', 'capture'], true)
                && (string) ($status['status_code'] ?? '') === '200'
                && ($status['fraud_status'] ?? ($state === 'capture' ? '' : 'accept')) === 'accept';
            $failed = in_array($state, ['deny', 'cancel', 'expire', 'failure'], true);
            if (! $paid && ! $failed) {
                return;
            }
            DB::table('pembayaran')->where('id_pembayaran', $payment->id_pembayaran)->update([
                'status_bayar' => $paid ? 'dibayar' : 'ditolak', 'metode' => $status['payment_type'] ?? 'midtrans',
                'waktu_bayar' => $paid ? now() : null, 'updated_at' => now(),
            ]);
            if ($paid) {
                $paidTotal = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('status_bayar', 'dibayar')->sum('jumlah');
                $nextStatus = (float) $paidTotal >= (float) $order->total ? 'lunas' : 'dp_dibayar';
                if ($nextStatus !== 'lunas' && in_array($order->status_pesanan, ['diproses', 'dikirim', 'diterima', 'menunggu_pelunasan'], true)) {
                    $nextStatus = $order->status_pesanan;
                }
                DB::table('pesanan')->where('id_pesanan', $order->id_pesanan)->update(['status_pesanan' => $nextStatus, 'updated_at' => now()]);
            }
            $this->firebase->enqueue($order->kode_pesanan);
        });
    }

    public function create(Request $request, string $code): JsonResponse
    {
        $order = $this->access->authorize($request, $code);
        abort_if($this->access->simulation((int) $order->id_pesanan), 409, 'Pesanan menggunakan simulasi. Unggah contoh bukti tanpa transfer uang.');
        abort_if(DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('metode', 'transfer_manual')->where('status_bayar', 'menunggu')->exists(), 409, 'Bukti transfer masih menunggu verifikasi admin.');
        $key = $this->serverKey();
        $data = $request->validate(['jenis' => 'required|in:dp,pelunasan']);
        $latest = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('jenis', $data['jenis'])->where('status_bayar', 'menunggu')->orderByDesc('id_pembayaran')->first();
        if ($latest !== null) {
            $status = $this->remoteStatus($latest->id_transaksi);
            if ($status !== null) {
                $this->applyStatus($latest->id_transaksi, $status);
            }
        }
        $result = DB::transaction(function () use ($request, $code, $data, $key): array {
            $order = $this->access->authorize($request, $code, true);
            abort_if($this->access->simulation((int) $order->id_pesanan), 409, 'Pesanan menggunakan simulasi. Unggah contoh bukti tanpa transfer uang.');
            abort_if(DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('metode', 'transfer_manual')->where('status_bayar', 'menunggu')->exists(), 409, 'Bukti transfer masih menunggu verifikasi admin.');
            abort_unless($order->status_penawaran === 'diterima', 409, 'Terima penawaran terlebih dahulu.');
            $paid = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('status_bayar', 'dibayar')->sum('jumlah');
            abort_if((float) $paid >= (float) $order->total, 409, 'Pesanan sudah lunas.');
            $dpPaid = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('jenis', 'dp')->where('status_bayar', 'dibayar')->exists();
            abort_if(($data['jenis'] === 'dp' && $dpPaid) || ($data['jenis'] === 'pelunasan' && ! $dpPaid), 409, 'Urutan pembayaran tidak sesuai. Bayar DP terlebih dahulu, kemudian pelunasan.');
            $existing = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('jenis', $data['jenis'])->where('status_bayar', 'menunggu')->orderByDesc('id_pembayaran')->first();
            if ($existing?->redirect_url !== null) {
                return ['redirect_url' => $existing->redirect_url, 'jumlah' => $existing->jumlah, 'jenis' => $existing->jenis];
            }
            $percent = max(1, min(99, (int) config('services.midtrans.dp_percent', 50)));
            $amount = $data['jenis'] === 'dp' ? (int) ceil((float) $order->total * $percent / 100) : (int) round((float) $order->total - (float) $paid);
            $transaction = $order->kode_pesanan.'-'.$data['jenis'].'-'.Str::random(8);
            $customer = json_decode($order->data_pengiriman, true);
            try {
                $response = Http::withBasicAuth($key, '')->acceptJson()->connectTimeout(5)->timeout(15)
                    ->post('https://app.sandbox.midtrans.com/snap/v1/transactions', [
                        'transaction_details' => ['order_id' => $transaction, 'gross_amount' => $amount],
                        'customer_details' => ['first_name' => $customer['nama'] ?? 'Pembeli', 'phone' => $customer['no_hp'] ?? ''],
                        'credit_card' => ['secure' => true],
                    ]);
            } catch (ConnectionException) {
                abort(502, 'Midtrans belum dapat dihubungi. Coba lagi nanti.');
            }
            $url = $response->json('redirect_url');
            abort_unless($response->successful() && is_string($response->json('token')) && is_string($url) && parse_url($url, PHP_URL_HOST) === 'app.sandbox.midtrans.com' && parse_url($url, PHP_URL_SCHEME) === 'https', 502, 'Midtrans belum dapat membuat halaman pembayaran.');
            DB::table('pembayaran')->insert([
                'id_pesanan' => $order->id_pesanan, 'jenis' => $data['jenis'], 'metode' => 'midtrans', 'mata_uang' => 'IDR', 'jumlah' => $amount,
                'status_bayar' => 'menunggu', 'id_transaksi' => $transaction, 'snap_token' => $response->json('token'), 'redirect_url' => $url, 'created_at' => now(), 'updated_at' => now(),
            ]);

            return ['redirect_url' => $url, 'jumlah' => $amount, 'jenis' => $data['jenis']];
        });

        return response()->json(['data' => $result]);
    }

    public function refresh(Request $request, string $code): JsonResponse
    {
        $order = $this->access->authorize($request, $code);
        $payments = DB::table('pembayaran')->where('id_pesanan', $order->id_pesanan)->where('status_bayar', 'menunggu')->whereNotNull('id_transaksi')->get();
        foreach ($payments as $payment) {
            $status = $this->remoteStatus($payment->id_transaksi);
            if ($status !== null) {
                $this->applyStatus($payment->id_transaksi, $status);
            }
        }

        return response()->json(['message' => 'Status pembayaran diperbarui.']);
    }

    public function webhook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|string|max:100', 'status_code' => 'required|string|max:5', 'gross_amount' => 'required|string|max:30', 'signature_key' => 'required|string|size:128',
        ]);
        $signatureKey = (string) config('services.midtrans.signature_key');
        if ($signatureKey === '') {
            $signatureKey = $this->serverKey();
        }
        $expected = hash('sha512', $data['order_id'].$data['status_code'].$data['gross_amount'].$signatureKey);
        abort_unless(hash_equals($expected, $data['signature_key']), 401, 'Signature pembayaran tidak valid.');
        abort_unless(DB::table('pembayaran')->where('id_transaksi', $data['order_id'])->exists(), 404);
        $status = $this->remoteStatus($data['order_id']);
        if ($status !== null) {
            $this->applyStatus($data['order_id'], $status);
        }

        return response()->json(['message' => 'OK']);
    }
}
