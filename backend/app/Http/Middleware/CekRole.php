<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CekRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, $roles)) {
            return response()->json(['success' => false, 'message' => 'Akses ditolak'], 403);
        }

        return $next($request);
    }
}
