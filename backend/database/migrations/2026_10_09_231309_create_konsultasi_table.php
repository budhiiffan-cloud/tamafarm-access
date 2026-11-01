<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('konsultasi', function (Blueprint $table) {
            $table->id('id_konsultasi');
            $table->unsignedBigInteger('id_pelanggan');
            $table->unsignedBigInteger('id_user')
                ->nullable();
            $table->enum('pengirim', [
                'pelanggan',
                'admin',
            ]);
            $table->text('isi_pesan');
            $table->dateTime('waktu_kirim')
                ->useCurrent();
            $table->timestamps();
            $table->foreign('id_pelanggan')
                ->references('id_pelanggan')
                ->on('pelanggan')
                ->cascadeOnDelete();
            $table->foreign('id_user')
                ->references('id_user')
                ->on('users')
                ->nullOnDelete();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('konsultasi');
    }
};
