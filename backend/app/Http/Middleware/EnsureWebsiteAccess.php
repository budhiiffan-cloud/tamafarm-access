<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
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
        if (! is_string($password) || ! password_verify($password, (string) config('website.password_hash'))) {
            return response()->json([
                'code' => 'WEBSITE_ACTIVATION_REQUIRED',
                'message' => 'Website belum diaktifkan. Isi WEBSITE_ACCESS_PASSWORD di backend/.env dengan password dari pemilik proyek.',
            ], 503)->header('Cache-Control', 'no-store');
        }

        return $next($request);
    }
}
