<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SawController extends Controller
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

        $finalScores = [];
        for ($i = 0; $i < $numAlternatives; $i++) {
            $score = 0;
            for ($j = 0; $j < $numCriteria; $j++) {
                $score += $normalizedMatrix[$i][$j] * ($weights[$j] / 100);
            }
            $finalScores[] = [
                'name' => $alternativeNames[$i],
                'score' => $score
            ];
        }

        return response()->json([
            'method' => 'saw',
            'scores' => $finalScores
        ]);
    }
}
