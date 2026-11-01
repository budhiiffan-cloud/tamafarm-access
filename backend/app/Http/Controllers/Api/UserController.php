<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => User::where('role', 'admin')->orderBy('nama')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'username' => 'required|alpha_dash|min:4|max:30|unique:users,username',
            'password' => 'required|string|min:6',
        ]);

        $data['role'] = 'admin'; // dipaksa admin, pemilik tidak bisa dibuat lewat API

        return response()->json([
            'success' => true,
            'message' => 'Akun admin dibuat',
            'data' => User::create($data),
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        abort_if($user->role !== 'admin', 404);

        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'username' => "required|alpha_dash|min:4|max:30|unique:users,username,{$user->id_user},id_user",
            'password' => 'nullable|string|min:6',
        ]);

        if (empty($data['password'])) {
            unset($data['password']); // kosong = password tidak diubah
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Akun admin diperbarui',
            'data' => $user,
        ]);
    }

    public function destroy(User $user)
    {
        abort_if($user->role !== 'admin', 404);

        $user->tokens()->delete(); // paksa logout admin yang dihapus
        $user->delete();

        return response()->json(['success' => true, 'message' => 'Akun admin dihapus']);
    }
}
