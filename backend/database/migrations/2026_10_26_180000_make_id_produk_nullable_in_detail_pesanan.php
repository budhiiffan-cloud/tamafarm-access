<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detail_pesanan', function (Blueprint $table): void {
            $table->unsignedBigInteger('id_produk')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('detail_pesanan', function (Blueprint $table): void {
            $table->unsignedBigInteger('id_produk')->nullable(false)->change();
        });
    }
};
