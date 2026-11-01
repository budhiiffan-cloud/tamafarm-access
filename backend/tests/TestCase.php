<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['website.password' => 'website-test-password']);
        $this->withHeaders(['X-Website-Password' => 'website-test-password']);
    }
}
