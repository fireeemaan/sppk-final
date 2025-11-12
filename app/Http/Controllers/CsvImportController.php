<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use League\Csv\Reader;
use League\Csv\Statement;

class CsvImportController extends Controller
{
    public function import(Request $request)
    {

        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt'
        ]);

        $file = $request->file('csv_file');

        try {
            $csv = Reader::from($file->getPathname(), 'r');
            $csv->setHeaderOffset(0);

            $statement = (new Statement())->offset(0);
            $records = $statement->process($csv)->getRecords();
            $header = $csv->getHeader();

            $criteria = [];
            $criterionNames = array_slice($header, 1);
            $alternatives = [];
            $matrix = [];
            $rowNum = 2;

            Log::info('[Header Criterion] -', $criterionNames);
            Log::info('[Records] -', iterator_to_array($records));

            foreach ($criterionNames as $index => $name) {
                $criteria[] = [
                    'id' => $index + 1,
                    'name' => $name,
                    'weight' => 0,
                    'type' => 'benefit'
                ];
            }

            foreach ($records as $record) {

                $record = array_values($record);

                $alternativeName = $record[0];
                $scores = array_slice($record, 1);

                $alternatives[] = [
                    'id' => $rowNum - 1,
                    'name' => $alternativeName
                ];
                $matrix[] = array_map('floatval', $scores);

                $rowNum++;
            }

            if (empty($alternatives)) {
                throw new \Exception("CSV file has no data rows or is in the wrong format.");
            }

            return response()->json([
                'criteria' => $criteria,
                'alternatives' => $alternatives,
                'matrix' => $matrix,
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
