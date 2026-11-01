<?php

use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuyerOrderController;
use App\Http\Controllers\Api\BuyerProfileController;
use App\Http\Controllers\Api\ConsultationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FirebaseController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\ManualPaymentController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProdukController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Publik
Route::get('/website-access', fn () => response()->json(['success' => true]));
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:60,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:60,1');
Route::post('/lupa-password', [AuthController::class, 'lupaPassword'])->middleware('throttle:30,1');
Route::get('/produk', [ProdukController::class, 'index']);
Route::get('/produk/{produk}', [ProdukController::class, 'show']);
Route::post('/pesanan', [BuyerOrderController::class, 'store'])->middleware('throttle:10,1');
Route::get('/pesanan/{code}', [BuyerOrderController::class, 'show'])->middleware('throttle:60,1');
Route::post('/pesanan/{code}/penawaran', [BuyerOrderController::class, 'decision'])->middleware('throttle:10,1');
Route::post('/pesanan/{code}/diterima', [BuyerOrderController::class, 'received'])->middleware('throttle:10,1');
Route::post('/pesanan/{code}/pembayaran', [PaymentController::class, 'create'])->middleware('throttle:10,1');
Route::post('/pesanan/{code}/status-pembayaran', [PaymentController::class, 'refresh'])->middleware('throttle:10,1');
Route::post('/midtrans/notification', [PaymentController::class, 'webhook']);
Route::post('/konsultasi/mulai', [ConsultationController::class, 'start'])->middleware('throttle:30,1');
Route::get('/konsultasi/{id}', [ConsultationController::class, 'messages'])->middleware('throttle:120,1');
Route::post('/konsultasi/{id}', [ConsultationController::class, 'send'])->middleware('throttle:60,1');

// Wajib login
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/password', [AuthController::class, 'ubahPassword']);
    Route::get('/kategori', [KategoriController::class, 'index']);

    Route::middleware('role:pelanggan')->group(function () {
        Route::post('/pembeli/firebase/session', [FirebaseController::class, 'session'])->middleware('throttle:10,1');
        Route::post('/pembeli/firebase/perangkat', [FirebaseController::class, 'store'])->middleware('throttle:30,1');
        Route::delete('/pembeli/firebase/perangkat', [FirebaseController::class, 'destroy'])->middleware('throttle:30,1');
        Route::get('/pembeli/profil', [BuyerProfileController::class, 'show']);
        Route::put('/pembeli/profil', [BuyerProfileController::class, 'update']);
        Route::get('/pembeli/pesanan', [BuyerOrderController::class, 'index']);
        Route::get('/pembeli/firebase/session', function () {
            return response()->json(['success' => true, 'message' => 'Firebase session aktif']);
        });
        Route::post('/pembeli/pesanan', [BuyerOrderController::class, 'store'])->middleware('throttle:10,1');
        Route::get('/pembeli/pesanan/{code}', [BuyerOrderController::class, 'show']);
        Route::post('/pembeli/pesanan/{code}/bukti', [ManualPaymentController::class, 'store'])->middleware('throttle:10,1');
        Route::get('/pembeli/pesanan/{code}/bukti/{payment}', [ManualPaymentController::class, 'show'])->middleware('throttle:30,1');
        Route::post('/pembeli/pesanan/{code}/penawaran', [BuyerOrderController::class, 'decision'])->middleware('throttle:10,1');
        Route::post('/pembeli/pesanan/{code}/diterima', [BuyerOrderController::class, 'received'])->middleware('throttle:10,1');
        Route::post('/pembeli/pesanan/{code}/pembayaran', [PaymentController::class, 'create'])->middleware('throttle:10,1');
        Route::post('/pembeli/pesanan/{code}/status-pembayaran', [PaymentController::class, 'refresh'])->middleware('throttle:10,1');
    });

    Route::middleware('role:admin,pemilik')->group(function () {
        Route::get('/pengelolaan/dashboard', [DashboardController::class, 'index']);
        Route::get('/pengelolaan/laporan', [AdminOrderController::class, 'report']);
        Route::get('/pengelolaan/pelanggan', [AdminOrderController::class, 'customers']);
        Route::get('/pengelolaan/pelanggan/{customer}/pesanan', [AdminOrderController::class, 'customerHistory'])->whereNumber('customer');
        Route::get('/pengelolaan/pesanan', [AdminOrderController::class, 'index']);
    });

    // Admin: kelola kategori & produk
    Route::middleware('role:admin')->group(function () {
        Route::get('/pengelolaan/pesanan/{code}', [AdminOrderController::class, 'show']);
        Route::get('/pengelolaan/pesanan/{code}/bukti/{payment}', [ManualPaymentController::class, 'show'])->middleware('throttle:30,1');
        Route::post('/pengelolaan/pesanan/{code}/pembayaran/{payment}/verifikasi', [ManualPaymentController::class, 'verify'])->middleware('throttle:30,1');
        Route::post('/pengelolaan/pesanan/{code}/penawaran', [AdminOrderController::class, 'offer']);
        Route::post('/pengelolaan/pesanan/{code}/tolak', [AdminOrderController::class, 'reject']);
        Route::post('/pengelolaan/pesanan/{code}/pengiriman', [AdminOrderController::class, 'shipment']);
        Route::get('/pengelolaan/konsultasi', [ConsultationController::class, 'threads']);
        Route::apiResource('kategori', KategoriController::class)->except(['index']);
        Route::apiResource('produk', ProdukController::class)->except(['index', 'show']);
    });

    // Pemilik: kelola akun admin
    Route::middleware('role:pemilik')->group(function () {
        Route::apiResource('admin', UserController::class)
            ->except(['show'])
            ->parameters(['admin' => 'user']);
    });
});
