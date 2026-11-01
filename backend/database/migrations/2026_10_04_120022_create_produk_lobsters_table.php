<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('produk_lobster', function (Blueprint $table) {
            $table->id('id_produk');
            $table->foreignId('id_kategori')
                ->constrained('kategori', 'id_kategori')->restrictOnDelete();
            $table->string('nama_produk', 100);
            $table->enum('satuan', ['kg', 'paket']);
            $table->text('deskripsi')->nullable();
            $table->string('ukuran', 50)->nullable();
            $table->unsignedBigInteger('harga');
            $table->decimal('harga_usd', 10, 2)->nullable();
            $table->decimal('stok', 10, 2)->default(0);
            $table->decimal('moq_restoran', 8, 2)->nullable();
            $table->decimal('moq_luar_negeri', 8, 2)->nullable();
            $table->string('gambar')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produk_lobster');
    }
};
