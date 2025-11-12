<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SawTopsisController extends Controller
{
    public function calculate(Request $request)
    {
        $data = $request->validate([
            'weights' => 'required|array',
            'weights.*' => 'numeric|min:0|max:100',
            'criteria' => 'required|array',
            'criteria.*' => 'string|in:benefit,cost',
            'alternatives' => 'required|array',
            'alternatives.*' => 'array',
            'alternatives.*.*' => 'numeric|min:0',
            'alternativeNames' => 'required|array',
            'alternativeNames.*' => 'string',
        ]);

        $weights = $data['weights'];
        $criteriaTypes = $data['criteria'];
        $matrix = $data['alternatives'];
        $alternativeNames = $data['alternativeNames'];

        $numCriteria = count($weights);
        $numAlternatives = count($matrix);

        // SAW

        $maxValues = [];
        $minValues = [];

        for ($j = 0; $j < $numCriteria; $j++) {
            $column = array_map(fn($row) => $row[$j], $matrix);
            $maxValues[$j] = max($column);
            $minValues[$j] = min($column);
        }

        $normalizedMatrix = [];
        for ($i = 0; $i < $numAlternatives; $i++) {
            for ($j = 0; $j < $numCriteria; $j++) {
                $value = $matrix[$i][$j];

                if ($criteriaTypes[$j] == 'benefit') {
                    // Benefit: value / max
                    $normalizedMatrix[$i][$j] = $maxValues[$j] == 0 ? 0 : $value / $maxValues[$j];
                } else {
                    // Cost: min / value
                    $normalizedMatrix[$i][$j] = $value == 0 ? 0 : $minValues[$j] / $value;
                }
            }
        }

        Log::info('[Normalized Matrix] -', $normalizedMatrix);

        // TOPSIS

        $weightedMatrix = [];
        for ($i = 0; $i < $numAlternatives; $i++) {
            for ($j = 0; $j < $numCriteria; $j++) {
                $weightedMatrix[$i][$j] = $normalizedMatrix[$i][$j] * ($weights[$j] / 100);
            }
        }
        Log::info('[Weighted Matrix] -', $weightedMatrix);


        $idealPositive = [];
        $idealNegative = [];

        for ($j = 0; $j < $numCriteria; $j++) {
            $column = array_map(fn($row) => $row[$j], $weightedMatrix);
            if ($criteriaTypes[$j] == 'benefit') {
                $idealPositive[$j] = max($column);
                $idealNegative[$j] = min($column);
            } else {
                $idealPositive[$j] = min($column);
                $idealNegative[$j] = max($column);
            }
        }

        Log::info('[Ideal Positive] -', $idealPositive);
        Log::info('[Ideal Negative] -', $idealNegative);

        $separationPositive = [];
        $separationNegative = [];

        for ($i = 0; $i < $numAlternatives; $i++) {
            $sPlus = 0;
            $sMinus = 0;
            for ($j = 0; $j < $numCriteria; $j++) {
                $sPlus += ($weightedMatrix[$i][$j] - $idealPositive[$j]) ** 2;
                $sMinus += ($weightedMatrix[$i][$j] - $idealNegative[$j]) ** 2;
            }
            $separationPositive[$i] = sqrt($sPlus);
            $separationNegative[$i] = sqrt($sMinus);
        }

        Log::info('[Separation Positive] -', $separationPositive);
        Log::info('[Separation Negative] -', $separationNegative);


        $finalScores = [];
        for ($i = 0; $i < $numAlternatives; $i++) {
            $denominator = $separationPositive[$i] + $separationNegative[$i];
            $score = $denominator == 0 ? 0 : $separationNegative[$i] / $denominator;

            $finalScores[] = [
                'name' => $alternativeNames[$i],
                'score' => $score
            ];
        }

        return response()->json([
            'method' => 'saw-topsis',
            'scores' => $finalScores
        ]);
    }
}
