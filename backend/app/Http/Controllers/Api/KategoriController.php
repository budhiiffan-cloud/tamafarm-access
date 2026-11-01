<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use Illuminate\Http\Request;

class KategoriController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Kategori::orderBy('nama_kategori')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama_kategori' => 'required|string|max:100|unique:kategori,nama_kategori',
            'deskripsi' => 'nullable|string',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kategori ditambahkan',
            'data' => Kategori::create($data),
        ], 201);
    }

    public function show(Kategori $kategori)
    {
        return response()->json(['success' => true, 'data' => $kategori]);
    }

    public function update(Request $request, Kategori $kategori)
    {
        $data = $request->validate([
            'nama_kategori' => "required|string|max:100|unique:kategori,nama_kategori,{$kategori->id_kategori},id_kategori",
            'deskripsi' => 'nullable|string',
        ]);

        $kategori->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Kategori diperbarui',
            'data' => $kategori,
        ]);
    }

    public function destroy(Kategori $kategori)
    {
        if ($kategori->produk()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori masih memiliki produk',
            ], 422);
        }

        $kategori->delete();

        return response()->json(['success' => true, 'message' => 'Kategori dihapus']);
    }
}
