<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'website.password' => 'website-test-password',
            'website.password_hash' => password_hash('website-test-password', PASSWORD_BCRYPT, ['cost' => 4]),
        ]);
    }
}
