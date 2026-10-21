<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Infirmary: the visits and the suggested reasons. Every table carries the extension's prefix (infirmary_). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('infirmary_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('apprenants')->cascadeOnDelete();
            $table->dateTime('occurred_at');
            $table->string('reason', 160);
            $table->text('care')->nullable();
            $table->string('outcome', 20)->default('BACK_TO_CLASS');
            $table->boolean('parent_informed')->default(false);
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['learner_id', 'occurred_at']);
            $table->index('occurred_at');
        });

        Schema::create('infirmary_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('label', 160)->unique();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('infirmary_reasons');
        Schema::dropIfExists('infirmary_visits');
    }
};
