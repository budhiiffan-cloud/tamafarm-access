<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class EnsureWebsiteAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Midtrans verifies its own signed notifications in PaymentController.
        if ($request->is('api/midtrans/notification')) {
            return $next($request);
        }

        $password = config('website.password');
        if (! is_string($password) || trim($password) === '') {
            return response()->json([
                'message' => 'Akses website belum dikonfigurasi. Hubungi pemilik proyek untuk meminta password.',
            ], 503)->header('Cache-Control', 'no-store');
        }

        $rateKey = 'website-access:'.$request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 10)) {
            return response()->json([
                'message' => 'Terlalu banyak percobaan. Coba lagi dalam satu menit.',
            ], 429)->header('Retry-After', (string) RateLimiter::availableIn($rateKey));
        }

        if (! hash_equals($password, (string) $request->header('X-Website-Password', ''))) {
            RateLimiter::hit($rateKey, 60);

            return response()->json([
                'message' => 'Password akses website salah. Hubungi pemilik proyek untuk meminta password.',
            ], 423)->header('Cache-Control', 'no-store');
        }

        return $next($request);
    }
}
