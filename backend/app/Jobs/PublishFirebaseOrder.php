<?php

namespace App\Jobs;

use App\Services\FirebaseGateway;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

class PublishFirebaseOrder implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 60;

    public array $backoff = [10, 30, 120, 300];

    public function __construct(public string $code, public string $eventId, public bool $notify) {}

    public function middleware(): array
    {
        return [(new WithoutOverlapping($this->code))->releaseAfter(10)->expireAfter(75)];
    }

    /**
     * Execute the job.
     */
    public function handle(FirebaseGateway $firebase): void
    {
        $firebase->publish($this->code, $this->eventId, $this->notify);
    }
}
