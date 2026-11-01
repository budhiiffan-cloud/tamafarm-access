<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\RateLimiter;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class WebsiteAccessTest extends TestCase
{
    #[TestWith([''])]
    #[TestWith([null])]
    public function test_missing_server_password_keeps_the_website_locked(?string $password): void
    {
        config(['website.password' => $password]);

        $this->getJson('/api/website-access')->assertStatus(503)
            ->assertJsonPath('message', 'Akses website belum dikonfigurasi. Hubungi pemilik proyek untuk meminta password.');
    }

    #[TestWith(['GET', '/'])]
    #[TestWith(['GET', '/api/produk'])]
    #[TestWith(['POST', '/api/register'])]
    #[TestWith(['POST', '/api/pesanan'])]
    #[TestWith(['GET', '/api/pengelolaan/dashboard'])]
    public function test_missing_password_blocks_pages_and_api(string $method, string $path): void
    {
        $this->withHeaders(['X-Website-Password' => ''])->json($method, $path)
            ->assertStatus(423)->assertJsonMissingPath('data');
    }

    public function test_wrong_password_is_rejected(): void
    {
        $this->withHeaders(['X-Website-Password' => 'wrong'])->getJson('/api/website-access')
            ->assertStatus(423);
    }

    public function test_correct_password_unlocks_website_access(): void
    {
        $this->getJson('/api/website-access')->assertOk()->assertJsonPath('success', true);
    }

    public function test_website_password_does_not_replace_account_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_invalid_password_attempts_are_rate_limited(): void
    {
        RateLimiter::clear('website-access:127.0.0.1');
        $this->withHeaders(['X-Website-Password' => 'wrong']);
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->getJson('/api/website-access')->assertStatus(423);
        }
        $this->getJson('/api/website-access')->assertStatus(429)->assertHeader('Retry-After');
    }
}
