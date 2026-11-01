<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('pesanan', function (Blueprint $table) {

            $table->id('id_pesanan');
            $table->string('kode_pesanan')
                ->unique();
            $table->unsignedBigInteger('id_pelanggan');
            $table->dateTime('tanggal')
                ->useCurrent();
            $table->enum('status_pesanan', [
                'menunggu_persetujuan',
                'disetujui',
                'ditolak',
                'menunggu_dp',
                'dp_dibayar',
                'diproses',
                'dikirim',
                'diterima',
                'menunggu_pelunasan',
                'lunas',
                'dibatalkan',
            ])->default('menunggu_persetujuan');
            $table->enum('mata_uang', [
                'IDR',
                'USD',
            ])->default('IDR');
            $table->decimal(
                'kurs_saat_pesan',
                12,
                2
            )->nullable();
            $table->decimal(
                'total',
                12,
                2
            )->default(0);
            $table->text('catatan')
                ->nullable();
            $table->timestamps();
            $table->foreign('id_pelanggan')
                ->references('id_pelanggan')
                ->on('pelanggan')
                ->cascadeOnDelete();

        });

    }

    public function down(): void
    {
        Schema::dropIfExists('pesanan');
    }
};
