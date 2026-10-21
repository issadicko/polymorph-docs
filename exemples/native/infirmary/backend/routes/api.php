<?php

use Illuminate\Support\Facades\Route;
use PolymorphExt\Infirmary\Http\ReasonController;
use PolymorphExt\Infirmary\Http\VisitController;
use PolymorphExt\Infirmary\Models\Visit;

/*
 * Routes of the extension, under /api/v1/modules/infirmary. The core adds authentication and the "extension active
 * in the établissement" check; each route also requires a permission of the extension.
 */
Route::bind('visit', fn (string $id) => Visit::query()->visibleTo(auth()->user())->findOrFail((int) $id));

Route::middleware('permission:infirmary.view')->group(function () {
    Route::get('visits', [VisitController::class, 'index']);
    Route::get('learners/{learner}', [VisitController::class, 'forLearner'])->whereNumber('learner');
    Route::get('reasons', [ReasonController::class, 'index']);
});

Route::middleware('permission:infirmary.manage')->group(function () {
    Route::post('visits', [VisitController::class, 'store']);
    Route::put('visits/{visit}', [VisitController::class, 'update'])->whereNumber('visit');
    Route::delete('visits/{visit}', [VisitController::class, 'destroy'])->whereNumber('visit');
    Route::post('reasons', [ReasonController::class, 'store']);
    Route::delete('reasons/{reason}', [ReasonController::class, 'destroy'])->whereNumber('reason');
});
