<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use stdClass;

class ConsultationController extends Controller
{
    public function start(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if ($user !== null) {
            $customer = DB::table('pelanggan')->where('id_user', $user->id_user)->first();
            if ($customer === null) {
                $customerId = DB::table('pelanggan')->insertGetId([
                    'id_user' => $user->id_user,
                    'nama' => $user->nama ?: 'Pengguna',
                    'no_hp' => '081234567890',
                    'alamat' => 'Alamat Pengguna',
                    'negara' => 'Indonesia',
                    'tipe_pembeli' => 'perorangan',
                    'created_at' => now(),
                    'updated_at' => now(),
                ], 'id_pelanggan');
            } else {
                $customerId = $customer->id_pelanggan;
                if (! empty($user->nama) && ($customer->nama === 'Pengguna' || $customer->nama === 'Pengunjung Web' || empty($customer->nama))) {
                    DB::table('pelanggan')->where('id_pelanggan', $customerId)->update([
                        'nama' => $user->nama,
                        'updated_at' => now(),
                    ]);
                }
            }

            return response()->json(['data' => ['id_pelanggan' => $customerId, 'token_konsultasi' => null]]);
        }

        $nama = $request->input('nama') ?: 'Pengunjung Web';
        $noHp = $request->input('no_hp') ?: '081234567890';

        $token = Str::random(64);
        $id = DB::table('pelanggan')->insertGetId([
            'nama' => $nama,
            'no_hp' => $noHp,
            'tipe_pembeli' => 'perorangan',
            'token_konsultasi_hash' => hash('sha256', $token),
            'created_at' => now(),
            'updated_at' => now(),
        ], 'id_pelanggan');

        return response()->json(['data' => ['id_pelanggan' => $id, 'token_konsultasi' => $token]], 201);
    }

    private function authorizeThread(Request $request, int $id): stdClass
    {
        $customer = DB::table('pelanggan')->where('id_pelanggan', $id)->first();
        abort_if($customer === null, 404);
        $user = $request->user('sanctum');
        if ($user !== null && ($user->role === 'admin' || $user->role === 'pemilik' || (int) $customer->id_user === (int) $user->id_user)) {
            return $customer;
        }
        $token = (string) $request->header('X-Chat-Token', '');
        abort_unless($token !== '' && $customer->token_konsultasi_hash !== null && hash_equals($customer->token_konsultasi_hash, hash('sha256', $token)), 404);

        return $customer;
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $this->authorizeThread($request, $id);
        $messages = DB::table('konsultasi')
            ->where('id_pelanggan', $id)
            ->orderBy('id_konsultasi', 'asc')
            ->limit(100)
            ->get();

        return response()->json(['data' => $messages]);
    }

    public function send(Request $request, int $id): JsonResponse
    {
        $this->authorizeThread($request, $id);
        $data = $request->validate([
            'isi_pesan' => 'required|string|max:4000',
            'pengirim' => 'nullable|string|in:admin,pelanggan',
        ]);

        $user = $request->user('sanctum');
        $isStaff = $user !== null && in_array($user->role, ['admin', 'pemilik'], true);
        $customer = DB::table('pelanggan')->where('id_pelanggan', $id)->first();
        $isCustomerTheUser = $user !== null && $customer !== null && (int) $customer->id_user === (int) $user->id_user;

        $requestedSender = $data['pengirim'] ?? null;

        if ($isStaff && $requestedSender === 'admin') {
            $sender = 'admin';
        } elseif ($requestedSender === 'pelanggan') {
            $sender = 'pelanggan';
        } elseif ($isStaff && ! $isCustomerTheUser) {
            $sender = 'admin';
        } else {
            $sender = 'pelanggan';
        }

        DB::table('konsultasi')->insert([
            'id_pelanggan' => $id,
            'id_user' => $user?->id_user,
            'pengirim' => $sender,
            'isi_pesan' => $data['isi_pesan'],
            'waktu_kirim' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Pesan terkirim.'], 201);
    }

    public function threads(): JsonResponse
    {
        $latest = DB::table('konsultasi')->selectRaw('id_pelanggan, MAX(id_konsultasi) as latest_id')->groupBy('id_pelanggan');
        $threads = DB::table('pelanggan')
            ->joinSub($latest, 'latest', 'pelanggan.id_pelanggan', '=', 'latest.id_pelanggan')
            ->join('konsultasi', 'konsultasi.id_konsultasi', '=', 'latest.latest_id')
            ->orderByDesc('latest.latest_id')
            ->paginate(30, [
                'pelanggan.id_pelanggan',
                DB::raw("COALESCE(NULLIF(pelanggan.nama, ''), 'Pelanggan') as nama"),
                'konsultasi.isi_pesan',
                'konsultasi.waktu_kirim',
                'konsultasi.pengirim',
            ]);

        return response()->json(['data' => $threads]);
    }
}
