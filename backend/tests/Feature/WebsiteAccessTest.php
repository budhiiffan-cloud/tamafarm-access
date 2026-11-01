<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class WebsiteAccessTest extends TestCase
{
    #[TestWith([''])]
    #[TestWith([null])]
    #[TestWith(['wrong-password'])]
    public function test_missing_or_wrong_environment_password_blocks_access(?string $password): void
    {
        config(['website.password' => $password]);

        $this->getJson('/api/website-access')->assertStatus(503)
            ->assertJsonPath('code', 'WEBSITE_ACTIVATION_REQUIRED');
    }

    #[TestWith(['GET', '/'])]
    #[TestWith(['GET', '/api/produk'])]
    #[TestWith(['POST', '/api/register'])]
    #[TestWith(['POST', '/api/pesanan'])]
    #[TestWith(['GET', '/api/pengelolaan/dashboard'])]
    public function test_browser_cannot_override_invalid_environment_password(string $method, string $path): void
    {
        config(['website.password' => 'wrong-password']);

        $this->withHeaders(['X-Website-Password' => 'website-test-password'])->json($method, $path)
            ->assertStatus(503)->assertJsonMissingPath('data');
    }

    public function test_correct_environment_password_unlocks_without_browser_password(): void
    {
        $this->getJson('/api/website-access')->assertOk()->assertJsonPath('success', true);
    }

    public function test_missing_password_hash_keeps_access_locked(): void
    {
        config(['website.password_hash' => '']);

        $this->getJson('/api/website-access')->assertStatus(503);
    }

    public function test_activation_does_not_replace_account_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
