<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->enum('role', ['admin', 'pemilik', 'pelanggan'])->change();
        });

        Schema::table('pelanggan', function (Blueprint $table): void {
            $table->foreignId('id_user')->nullable()->unique()
                ->constrained('users', 'id_user')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('users')->where('role', 'pelanggan')->exists()) {
            throw new RuntimeException('Rollback tidak bisa dilakukan selama akun pelanggan masih ada.');
        }

        Schema::table('pelanggan', function (Blueprint $table): void {
            $table->dropForeign(['id_user']);
            $table->dropUnique(['id_user']);
            $table->dropColumn('id_user');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->enum('role', ['admin', 'pemilik'])->change();
        });
    }
};
