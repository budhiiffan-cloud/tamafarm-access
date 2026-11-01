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
        Schema::table('pelanggan', function (Blueprint $table): void {
            $table->string('token_konsultasi_hash', 64)->nullable();
        });
        Schema::table('pesanan', function (Blueprint $table): void {
            $table->string('token_akses_hash', 64)->nullable();
            $table->json('data_pengiriman')->nullable();
            $table->unsignedBigInteger('biaya_pengiriman')->default(0);
            $table->text('catatan_penawaran')->nullable();
            $table->enum('status_penawaran', ['menunggu', 'diterima', 'ditolak'])->nullable();
            $table->timestamp('penawaran_dikirim_at')->nullable();
            $table->timestamp('penawaran_dijawab_at')->nullable();
        });
        Schema::table('detail_pesanan', function (Blueprint $table): void {
            $table->string('nama_produk')->nullable();
            $table->string('satuan', 10)->nullable();
        });
        Schema::table('pembayaran', function (Blueprint $table): void {
            $table->string('snap_token')->nullable();
            $table->text('redirect_url')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table): void {
            $table->dropColumn(['snap_token', 'redirect_url']);
        });
        Schema::table('detail_pesanan', function (Blueprint $table): void {
            $table->dropColumn(['nama_produk', 'satuan']);
        });
        Schema::table('pesanan', function (Blueprint $table): void {
            $table->dropColumn(['token_akses_hash', 'data_pengiriman', 'biaya_pengiriman', 'catatan_penawaran', 'status_penawaran', 'penawaran_dikirim_at', 'penawaran_dijawab_at']);
        });
        Schema::table('pelanggan', function (Blueprint $table): void {
            $table->dropColumn('token_konsultasi_hash');
        });
    }
};
