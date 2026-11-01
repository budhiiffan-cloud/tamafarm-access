<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('detail_pesanan', function (Blueprint $table) {

            $table->id('id_detail');
            $table->unsignedBigInteger('id_pesanan');
            $table->unsignedBigInteger('id_produk');
            $table->decimal(
                'jumlah',
                10,
                2
            );
            $table->decimal(
                'harga_satuan',
                12,
                2
            );
            $table->decimal(
                'subtotal',
                12,
                2
            );
            $table->foreign('id_pesanan')
                ->references('id_pesanan')
                ->on('pesanan')
                ->cascadeOnDelete();
            $table->foreign('id_produk')
                ->references('id_produk')
                ->on('produk_lobster');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detail_pesanan');
    }
};
