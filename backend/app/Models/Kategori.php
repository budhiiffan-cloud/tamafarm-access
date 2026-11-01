<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kategori extends Model
{
    protected $table = 'kategori';

    protected $primaryKey = 'id_kategori';

    protected $fillable = ['nama_kategori', 'deskripsi'];

    public function produk()
    {
        return $this->hasMany(ProdukLobster::class, 'id_kategori', 'id_kategori');
    }
}
