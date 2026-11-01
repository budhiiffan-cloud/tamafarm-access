<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuyerProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profile = DB::table('pelanggan')->where('id_user', $request->user()->id_user)->first();
        abort_if($profile === null, 404, 'Profil pelanggan belum tersedia.');
        unset($profile->token_konsultasi_hash);

        return response()->json(['data' => $profile]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'no_hp' => 'required|string|max:20|regex:/^[+0-9 ()-]{6,20}$/',
            'alamat' => 'required|string|max:2000',
            'negara' => 'required|string|max:50',
            'tipe_pembeli' => 'required|in:perorangan,restoran,luar_negeri',
        ]);
        DB::transaction(function () use ($request, $data): void {
            DB::table('pelanggan')->updateOrInsert(['id_user' => $request->user()->id_user], array_merge($data, ['updated_at' => now()]));
            $request->user()->update(['nama' => $data['nama']]);
        });

        return $this->show($request);
    }
}
