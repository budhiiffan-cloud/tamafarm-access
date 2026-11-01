<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FirebaseGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class FirebaseController extends Controller
{
    public function session(Request $request, FirebaseGateway $firebase): JsonResponse
    {
        abort_unless($firebase->configured(), 503, 'Firebase belum diaktifkan.');
        $userId = (int) $request->user()->id_user;
        try {
            $token = $firebase->customToken($userId);
        } catch (\RuntimeException|\JsonException) {
            abort(503, 'Konfigurasi Firebase belum lengkap atau tidak sesuai proyek.');
        }
        $orders = DB::table('pesanan')->join('pelanggan', 'pesanan.id_pelanggan', '=', 'pelanggan.id_pelanggan')
            ->where('pelanggan.id_user', $userId)->orderByDesc('id_pesanan')->limit(50)->pluck('kode_pesanan');
        foreach ($orders as $code) {
            $firebase->enqueue($code, false);
        }

        return response()->json(['data' => ['token' => $token, 'uid' => 'buyer_'.$userId, 'project_id' => config('services.firebase.project_id')]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string|min:20|max:4096', 'server' => 'required|url|max:512'], ['token.required' => 'Token perangkat wajib diisi.']);
        $session = $request->user()->currentAccessToken();
        abort_unless($session instanceof PersonalAccessToken, 403, 'Gunakan sesi aplikasi untuk mendaftarkan perangkat.');
        $hash = hash('sha256', $data['token']);
        DB::transaction(function () use ($request, $session, $data, $hash): void {
            DB::table('users')->where('id_user', $request->user()->id_user)->lockForUpdate()->first();
            DB::table('firebase_devices')->upsert([[
                'token_hash' => $hash, 'id_user' => $request->user()->id_user, 'session_id' => $session->id,
                'token' => Crypt::encryptString($data['token']), 'server' => rtrim($data['server'], '/'), 'updated_at' => now(),
            ]], ['token_hash'], ['id_user', 'session_id', 'token', 'server', 'updated_at']);
            $extra = DB::table('firebase_devices')->where('id_user', $request->user()->id_user)
                ->where('token_hash', '!=', $hash)->orderByDesc('updated_at')->orderByDesc('id')->skip(4)->take(100)->pluck('id');
            DB::table('firebase_devices')->whereIn('id', $extra)->delete();
        });

        return response()->json(['message' => 'Perangkat notifikasi tersimpan.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string|max:4096']);
        DB::table('firebase_devices')->where('id_user', $request->user()->id_user)->where('token_hash', hash('sha256', $data['token']))->delete();

        return response()->json(['message' => 'Perangkat notifikasi dilepas.']);
    }
}
