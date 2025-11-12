<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TopsisController extends Controller
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

        $normalizedMatrix = [];
        // rss = root sum square
        $rss = [];

        // Normalization

        for ($j = 0; $j < $numCriteria; $j++) {
            $sumOfSquares = 0;
            foreach ($matrix as $row) {
                $sumOfSquares += $row[$j] ** 2;
            }
            $rss[$j] = sqrt($sumOfSquares);
        }

        for ($i = 0; $i < $numAlternatives; $i++) {
            for ($j = 0; $j < $numCriteria; $j++) {
                $normalizedMatrix[$i][$j] = $rss[$j] == 0 ? 0 : $matrix[$i][$j] / $rss[$j];
            }
        }

        // Weighted Normalized Decision Matrix

        $weightedMatrix = [];
        for ($i = 0; $i < $numAlternatives; $i++) {
            for ($j = 0; $j < $numCriteria; $j++) {
                $weightedMatrix[$i][$j] = $normalizedMatrix[$i][$j] * $weights[$j];
            }
        }


        // Ideal Positive and Negative Solutions

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

        // Separation Measures

        $distancePositive = [];
        $distanceNegative = [];

        for ($i = 0; $i < $numAlternatives; $i++) {
            $sPlus = 0;
            $sMinus = 0;
            for ($j = 0; $j < $numCriteria; $j++) {
                $sPlus += ($weightedMatrix[$i][$j] - $idealPositive[$j]) ** 2;
                $sMinus += ($weightedMatrix[$i][$j] - $idealNegative[$j]) ** 2;
            }
            $distancePositive[$i] = sqrt($sPlus);
            $distanceNegative[$i] = sqrt($sMinus);
        }


        $finalScores = [];
        for ($i = 0; $i < $numAlternatives; $i++) {
            $denominator = $distancePositive[$i] + $distanceNegative[$i];
            $score = $denominator == 0 ? 0 : $distanceNegative[$i] / $denominator;

            $finalScores[] = [
                'name' => $alternativeNames[$i],
                'score' => $score
            ];
        }

        return response()->json([
            'method' => 'topsis',
            'scores' => $finalScores
        ]);
    }
}
