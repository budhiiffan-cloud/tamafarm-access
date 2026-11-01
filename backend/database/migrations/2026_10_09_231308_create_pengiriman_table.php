<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('pengiriman', function (Blueprint $table) {
            $table->id('id_pengiriman');
            $table->unsignedBigInteger('id_pesanan')
                ->unique();
            $table->string('kurir')
                ->nullable();
            $table->string('no_resi')
                ->nullable();
            $table->enum('status_pengiriman', [
                'diproses',
                'dikirim',
                'diterima',
            ])->default('diproses');
            $table->date('tanggal_kirim')
                ->nullable();
            $table->date('tanggal_terima')
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
        Schema::dropIfExists('pengiriman');
    }
};
