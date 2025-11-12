<?php

use App\Http\Controllers\CsvImportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SawController;
use App\Http\Controllers\SawTopsisController;
use App\Http\Controllers\TopsisController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Calculator');
});

Route::post('/calculate/topsis', [TopsisController::class, 'calculate'])
    ->name('calculate.topsis');

Route::post('/calculate/saw', [SawController::class, 'calculate'])
    ->name('calculate.saw');

Route::post('/calculate/saw-topsis', [SawTopsisController::class, 'calculate'])
    ->name('calculate.saw-topsis');

Route::post('/import/csv', [CsvImportController::class, 'import'])
    ->name('import.csv');

require __DIR__.'/auth.php';
