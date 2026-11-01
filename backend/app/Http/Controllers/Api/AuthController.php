<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate(['username' => 'required|string', 'password' => 'required']);
        $user = User::where('username', $data['username'])->first();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Username tidak terdaftar'], 401);
        }
        if (! Hash::check($data['password'], $user->password)) {
            return response()->json(['success' => false, 'message' => 'Password salah'], 401);
        }

        return response()->json(['success' => true, 'message' => 'Login berhasil', 'data' => [
            'token' => $user->createToken('auth')->plainTextToken,
            'user' => $user,
        ]]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'username' => 'required|string|max:50|unique:users,username',
            'password' => 'required|string|min:6',
            'no_hp' => 'nullable|string|max:20',
        ], [
            'username.unique' => 'Username sudah digunakan, silakan pilih username lain.',
            'password.min' => 'Password minimal 6 karakter.',
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'nama' => $data['nama'],
                'username' => $data['username'],
                'password' => $data['password'],
                'role' => 'pelanggan',
            ]);

            DB::table('pelanggan')->insert([
                'id_user' => $user->id_user,
                'nama' => $data['nama'],
                'no_hp' => $data['no_hp'] ?: '081234567890',
                'alamat' => '-',
                'negara' => 'Indonesia',
                'tipe_pembeli' => 'perorangan',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $user;
        });

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil',
            'data' => [
                'token' => $user->createToken('auth')->plainTextToken,
                'user' => $user,
            ],
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['success' => true, 'message' => 'Logout berhasil']);
    }

    public function me(Request $request)
    {
        return response()->json(['success' => true, 'data' => $request->user()]);
    }

    public function ubahPassword(Request $request)
    {
        $data = $request->validate([
            'password_lama' => 'required|string',
            'password_baru' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($data['password_lama'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password lama salah',
                'errors' => ['password_lama' => ['Password lama salah']],
            ], 422);
        }

        $user->update(['password' => $data['password_baru']]); // otomatis di-hash

        // Perangkat lain dikeluarkan, perangkat yang sedang dipakai tetap login
        $user->tokens()
            ->where('id', '!=', $user->currentAccessToken()->id)
            ->delete();

        return response()->json(['success' => true, 'message' => 'Password diperbarui']);
    }

    public function lupaPassword(Request $request)
    {
        abort_if(app()->isProduction(), 503, 'Pemulihan password belum tersedia. Hubungi pengelola.');
        $data = $request->validate([
            'username' => 'required|string',
            'no_hp' => 'nullable|string',
            'password_baru' => 'required|string|min:6',
        ], [
            'username.required' => 'Username wajib diisi.',
            'password_baru.required' => 'Password baru wajib diisi.',
            'password_baru.min' => 'Password baru minimal 6 karakter.',
        ]);

        $user = User::where('username', $data['username'])->first();
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Username tidak terdaftar.',
            ], 404);
        }

        // Verifikasi no_hp jika pelanggan
        if ($user->role === 'pelanggan') {
            $pelanggan = DB::table('pelanggan')->where('id_user', $user->id_user)->first();
            if ($pelanggan && ! empty($pelanggan->no_hp) && $pelanggan->no_hp !== '-') {
                $inputHp = preg_replace('/[^0-9]/', '', $data['no_hp'] ?? '');
                $storedHp = preg_replace('/[^0-9]/', '', $pelanggan->no_hp);

                if (empty($inputHp) || (substr($inputHp, -7) !== substr($storedHp, -7))) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nomor WhatsApp / HP tidak cocok dengan data akun terdaftar.',
                    ], 422);
                }
            }
        }

        $user->update(['password' => $data['password_baru']]);

        // Hapus token lama agar harus login ulang dengan sandi baru
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kata sandi berhasil diubah! Silakan masuk dengan kata sandi baru Anda.',
        ]);
    }
}
