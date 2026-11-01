<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('pembayaran', function (Blueprint $table) {
            $table->id('id_pembayaran');
            $table->unsignedBigInteger('id_pesanan');
            $table->enum('jenis', [
                'dp',
                'pelunasan',
            ]);
            $table->string('metode')
                ->nullable();
            $table->enum('mata_uang', [
                'IDR',
                'USD',
            ])->nullable();
            $table->decimal(
                'jumlah',
                12,
                2
            )->nullable();
            $table->decimal(
                'kurs',
                12,
                2
            )->nullable();
            $table->enum('status_bayar', [
                'menunggu',
                'dibayar',
                'ditolak',
            ])->default('menunggu');
            $table->string('id_transaksi')
                ->nullable();
            $table->dateTime('waktu_bayar')
                ->nullable();
            $table->timestamps();
            $table->foreign('id_pesanan')
                ->references('id_pesanan')
                ->on('pesanan')
                ->cascadeOnDelete();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
    }
};
