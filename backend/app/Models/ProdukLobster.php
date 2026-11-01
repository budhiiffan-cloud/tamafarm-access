<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProdukLobster extends Model
{
    protected $table = 'produk_lobster';

    protected $primaryKey = 'id_produk';

    protected $fillable = [
        'id_kategori', 'nama_produk', 'satuan', 'deskripsi', 'ukuran',
        'harga', 'harga_usd', 'stok', 'moq_restoran', 'moq_luar_negeri', 'gambar',
    ];

    protected $appends = ['gambar_url'];

    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'id_kategori', 'id_kategori');
    }

    public function getGambarUrlAttribute()
    {
        if (! $this->gambar) {
            return null;
        }

        if (str_starts_with($this->gambar, 'http://') || str_starts_with($this->gambar, 'https://')) {
            return $this->gambar;
        }

        return asset('storage/'.$this->gambar);
    }
}
