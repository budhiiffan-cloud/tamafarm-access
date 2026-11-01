<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pelanggan', function (Blueprint $table) {

            $table->id('id_pelanggan');
            $table->string('nama', 100);
            $table->string('no_hp', 20);
            $table->text('alamat')->nullable();
            $table->string('negara', 50)->nullable();
            $table->enum('tipe_pembeli', [
                'perorangan',
                'restoran',
                'luar_negeri',
            ]);

            $table->timestamps();

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pelanggan');
    }
};
