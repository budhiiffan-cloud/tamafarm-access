<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProdukLobster;
use App\Services\PaymentProofStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProdukController extends Controller
{
    private function storeImage(Request $request): string
    {
        $storage = app(PaymentProofStorage::class);
        if (! $storage->configured()) {
            abort_if(app()->isProduction(), 503, 'Konfigurasi penyimpanan gambar Supabase belum lengkap.');

            return $request->file('gambar')->store('produk', 'public');
        }
        $file = $request->file('gambar');
        $path = $file->hashName('produk');
        $bucket = config('services.supabase.product_bucket');
        $storage->upload($path, $file, $bucket);

        return rtrim(config('services.supabase.url'), '/').'/storage/v1/object/public/'.rawurlencode($bucket).'/'.$path;
    }

    private function rules(): array
    {
        return [
            'id_kategori' => 'required|exists:kategori,id_kategori',
            'nama_produk' => 'required|string|max:100',
            'satuan' => 'required|in:kg,paket',
            'deskripsi' => 'nullable|string',
            'ukuran' => 'nullable|string|max:50',
            'harga' => 'required|integer|min:0',
            'harga_usd' => 'nullable|numeric|min:0',
            'stok' => 'required|numeric|min:0',
            'moq_restoran' => 'required_if:satuan,kg|nullable|numeric|min:1',
            'moq_luar_negeri' => 'required_if:satuan,kg|nullable|numeric|min:1',
            'gambar' => 'nullable|image|mimes:jpg,jpeg,png,webp,gif|max:10240',
            'hapus_foto' => 'nullable|boolean',
        ];
    }

    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => ProdukLobster::with('kategori')->latest()->get(),
        ]);
    }

    public function show(ProdukLobster $produk)
    {
        return response()->json([
            'success' => true,
            'data' => $produk->load('kategori'),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        if ($data['satuan'] === 'paket') {
            $data['moq_restoran'] = null;
            $data['moq_luar_negeri'] = null;
            $data['harga_usd'] = null;
        }
        if ($request->hasFile('gambar')) {
            $data['gambar'] = $this->storeImage($request);
        } else {
            $data['gambar'] = null;
        }

        return response()->json([
            'success' => true,
            'message' => 'Produk ditambahkan',
            'data' => ProdukLobster::create($data),
        ], 201);
    }

    public function update(Request $request, ProdukLobster $produk)
    {
        $data = $request->validate($this->rules());
        if ($data['satuan'] === 'paket') {
            $data['moq_restoran'] = null;
            $data['moq_luar_negeri'] = null;
            $data['harga_usd'] = null;
        }
        if ($request->boolean('hapus_foto')) {
            if ($produk->gambar) {
                Storage::disk('public')->delete($produk->gambar);
            }
            $data['gambar'] = null;
        } elseif ($request->hasFile('gambar')) {
            if ($produk->gambar) {
                Storage::disk('public')->delete($produk->gambar);
            }
            $data['gambar'] = $this->storeImage($request);
        } else {
            unset($data['gambar']); // tanpa file baru, gambar lama tetap
        }

        $produk->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Produk diperbarui',
            'data' => $produk,
        ]);
    }

    public function destroy(ProdukLobster $produk)
    {
        try {
            DB::transaction(function () use ($produk) {
                if ($produk->gambar) {
                    Storage::disk('public')->delete($produk->gambar);
                }

                // Jika produk ini pernah dipesan, set id_produk menjadi null di detail_pesanan
                // agar riwayat transaksi tetap terjaga tanpa terhalang foreign key constraint
                DB::table('detail_pesanan')
                    ->where('id_produk', $produk->id_produk)
                    ->update(['id_produk' => null]);

                $produk->delete();
            });

            return response()->json(['success' => true, 'message' => 'Produk dihapus']);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus produk: '.$e->getMessage(),
            ], 422);
        }
    }
}
