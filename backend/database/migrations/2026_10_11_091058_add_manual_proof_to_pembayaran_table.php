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
        Schema::table('pembayaran', function (Blueprint $table) {
            Schema::table('pembayaran', function (Blueprint $table) {
                $table->string('bukti_path')->nullable();
                $table->uuid('upload_key')->nullable()->unique();
                $table->text('catatan_verifikasi')->nullable();
                $table->timestamp('diverifikasi_at')->nullable();
            });
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            Schema::table('pembayaran', function (Blueprint $table) {
                $table->dropUnique(['upload_key']);
                $table->dropColumn(['bukti_path', 'upload_key', 'catatan_verifikasi', 'diverifikasi_at']);
            });
        });
    }
};
