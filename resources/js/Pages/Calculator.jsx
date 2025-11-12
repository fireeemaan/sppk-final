import React from 'react';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export default function Calculator() {

    const [method, setMethod] = useState('topsis');

    const [criteria, setCriteria] = useState([
        { id: 1, name: 'C1', weight: 4, type: 'benefit' },
        { id: 2, name: 'C2', weight: 3, type: 'cost' },
    ]);

    const [alternatives, setAlternatives] = useState([
        { id: 1, name: 'A1' },
        { id: 2, name: 'A2' },
    ]);

    const [matrix, setMatrix] = useState([
        [70, 80],
        [90, 60],
    ]);

    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [csvFile, setCsvFile] = useState(null);
    const [isCsvLoading, setIsCsvLoading] = useState(false);
    const [csvError, setCsvError] = useState(null);

    const rootRef = useRef(null);
    const scope = useRef(null);
    const resultsRef = useRef(null);

    useEffect(() => {
        scope.current = createScope({ root: rootRef.current }).add(self => {

            animate('.card-animate', {
                translateY: [50, 0],
                opacity: [0, 1],
                delay: stagger(100),
                easing: 'easeOutExpo'
            });

            self.add('showResults', () => {
                animate(resultsRef.current, {
                    translateY: [30, 0],
                    opacity: [0, 1],
                    easing: 'easeOutExpo',
                    duration: 600
                });
            });

        });

        return () => scope.current.revert();

    }, []);

    useEffect(() => {
        if (results && resultsRef.current && scope.current) {
            scope.current.methods.showResults();
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [results]);

    const handleMatrixChange = (altIndex, critIndex, value) => {
        const newMatrix = [...matrix];
        newMatrix[altIndex][critIndex] = parseFloat(value) || 0;
        setMatrix(newMatrix);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setCsvFile(e.target.files[0]);
            setCsvError(null);
        }
    };

    const handleCsvUpload = async () => {
        if (!csvFile) {
            setCsvError("Please select a file first.");
            return;
        }

        setIsCsvLoading(true);
        setCsvError(null);
        setResults(null);

        const formData = new FormData();
        formData.append('csv_file', csvFile);

        try {
            const response = await axios.post('/import/csv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setCriteria(response.data.criteria);
            setAlternatives(response.data.alternatives);
            setMatrix(response.data.matrix);

            toast.success('CSV data imported successfully!');
            setCsvFile(null);

        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                // setCsvError(`Import failed: ${err.response.data.message}`);
                toast.error(`Import failed: ${err.response.data.message}`);
            } else {
                // setCsvError("An unknown error occurred during import.");
                toast.error("An unknown error occurred during import.");
            }
        } finally {
            setIsCsvLoading(false);
        }
    };

    const handleCriteriaChange = (index, field, value) => {
        const newCriteria = [...criteria];
        if (field === 'weight') {
            let numValue = parseFloat(value) || 0;
            if (numValue > 100) numValue = 100;
            if (numValue < 0) numValue = 0;
            newCriteria[index][field] = numValue;
        } else {
            newCriteria[index][field] = value;
        }
        setCriteria(newCriteria);
    };

    const handleAlternativeChange = (index, field, value) => {
        const newAlternatives = [...alternatives];
        newAlternatives[index][field] = value;
        setAlternatives(newAlternatives);
    };

    const addCriterion = () => {
        const newId = (criteria.length > 0 ? Math.max(...criteria.map(c => c.id)) : 0) + 1;
        setCriteria([...criteria, { id: newId, name: `C${newId}`, weight: 0, type: 'benefit' }]);
        setMatrix(matrix.map(row => [...row, 0]));
    };

    const addAlternative = () => {
        const newId = (alternatives.length > 0 ? Math.max(...alternatives.map(a => a.id)) : 0) + 1;
        setAlternatives([...alternatives, { id: newId, name: `A${newId}` }]);
        setMatrix([...matrix, new Array(criteria.length).fill(0)]);
    };

    const removeCriterion = (indexToRemove) => {
        if (criteria.length <= 1) {
            toast.error("You must have at least one criterion.");
            return;
        }
        const newCriteria = criteria.filter((_, index) => index !== indexToRemove);

        const newMatrix = matrix.map(row =>
            row.filter((_, colIndex) => colIndex !== indexToRemove)
        );

        setCriteria(newCriteria);
        setMatrix(newMatrix);
    };

    const removeAlternative = (indexToRemove) => {
        if (alternatives.length <= 1) {
            toast.error("You must have at least one alternative.");
            return;
        }
        const newAlternatives = alternatives.filter((_, index) => index !== indexToRemove);

        const newMatrix = matrix.filter((_, rowIndex) => rowIndex !== indexToRemove);

        setAlternatives(newAlternatives);
        setMatrix(newMatrix);
    };

    const totalWeight = criteria.reduce((sum, crit) => sum + crit.weight, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setResults(null);
        setIsLoading(true);

        if (totalWeight !== 100) {
            // setError(`Total weight must be 100. Current total is ${totalWeight}.`);
            toast.error(`Total weight must be 100. Current total is ${totalWeight}.`);
            setIsLoading(false);
            return;
        }

        const url = `/calculate/${method}`;

        const payload = {
            weights: criteria.map(c => c.weight),
            criteria: criteria.map(c => c.type),
            alternatives: matrix,
            alternativeNames: alternatives.map(a => a.name)
        };

        try {
            const response = await axios.post(url, payload);

            setResults(response.data);
            setError(null);
            toast.success('Calculation completed!');

        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                // setError(err.response.data.message);
                toast.error(err.response.data.message);
            } else {
                toast.error("An unknown error occurred during calculation.");
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Head title="SPPK Calculator" />

            <div className="min-h-screen bg-gray-100 p-4 md:p-8" ref={rootRef}>
                <form onSubmit={handleSubmit} className="w-full max-w-7xl mx-auto space-y-6">

                    <div className="bg-white shadow-lg rounded-lg p-6 card-animate">
                        {/* <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">
                            SPPK Calculator
                        </h1> */}
                        <div className="flex justify-center rounded-md shadow-sm">
                            {/* <button
                                type="button"
                                onClick={() => setMethod('topsis')}
                                className={`px-6 py-2 text-lg font-medium rounded-l-md transition-all duration-150 ease-in-out ${method === 'topsis'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                TOPSIS
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('saw')}
                                className={`px-6 py-2 text-lg font-medium transition-all duration-150 ease-in-out ${method === 'saw'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                SAW
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('saw-topsis')}
                                className={`px-6 py-2 text-lg font-medium rounded-r-md transition-all duration-150 ease-in-out ${method === 'saw-topsis'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                SAW + TOPSIS
                            </button> */}
                        </div>
                    </div>

                    <div className="bg-white shadow-lg rounded-lg p-6 card-animate">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Import from CSV</h2>
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                           file:mr-4 file:py-2 file:px-4
                                           file:rounded-md file:border-0
                                           file:text-sm file:font-semibold
                                           file:bg-blue-50 file:text-blue-700
                                           hover:file:bg-blue-100"
                            />
                            <button
                                type="button"
                                onClick={handleCsvUpload}
                                disabled={isCsvLoading}
                                className="mt-4 md:mt-0 px-6 py-2 bg-gray-600 text-white font-semibold rounded-md shadow-md transition-all
                                           hover:bg-gray-700
                                           disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isCsvLoading ? "Importing..." : "Upload & Replace Data"}
                            </button>
                        </div>
                        {csvError && (
                            <p className="text-red-600 font-semibold mt-4">{csvError}</p>
                        )}
                    </div>

                    <div className="bg-white shadow-lg rounded-lg p-6 card-animate">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-gray-700">Criteria</h2>
                            <span className={`text-lg font-medium p-2 rounded ${totalWeight === 100 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                                }`}>
                                Total Weight: {totalWeight} / 100
                            </span>
                        </div>
                        <div className="space-y-4">
                            {criteria.map((crit, index) => (
                                <div key={crit.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center">
                                    <input
                                        type="text"
                                        value={crit.name}
                                        onChange={(e) => handleCriteriaChange(index, 'name', e.target.value)}
                                        className="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        placeholder="Criterion Name"
                                    />
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="range" value={crit.weight}
                                            onChange={(e) => handleCriteriaChange(index, 'weight', e.target.value)}
                                            min="0" max="100" step="1"
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <input
                                            type="number" value={crit.weight}
                                            onChange={(e) => handleCriteriaChange(index, 'weight', e.target.value)}
                                            min="0" max="100"
                                            className="form-input w-20 rounded-md border-gray-300 shadow-sm text-center focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <select
                                        value={crit.type}
                                        onChange={(e) => handleCriteriaChange(index, 'type', e.target.value)}
                                        className="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="benefit">Benefit</option>
                                        <option value="cost">Cost</option>
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => removeCriterion(index)}
                                        disabled={criteria.length <= 1}
                                        className="p-2 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addCriterion}
                            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all font-medium shadow"
                        >
                            + Add Criterion
                        </button>
                    </div>

                    <div className="bg-white shadow-lg rounded-lg card-animate">
                        <div className="p-6">
                            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Decision Matrix</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Alternative</th>
                                        {criteria.map((crit) => (
                                            <th key={crit.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {crit.name} (w={crit.weight})
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {alternatives.map((alt, altIndex) => (
                                        <tr key={alt.id}>
                                            <td className="px-4 py-4 whitespace-nowrap border-r">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={alt.name}
                                                        onChange={(e) => handleAlternativeChange(altIndex, 'name', e.target.value)}
                                                        className="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAlternative(altIndex)}
                                                        disabled={alternatives.length <= 1}
                                                        className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                            {criteria.map((crit, critIndex) => (
                                                <td key={crit.id} className="px-4 py-4 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        value={matrix[altIndex][critIndex]}
                                                        onChange={(e) => handleMatrixChange(altIndex, critIndex, e.target.value)}
                                                        className="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={addAlternative}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all font-medium shadow"
                            >
                                + Add Alternative
                            </button>
                        </div>
                    </div>

                    <div className="bg-white shadow-lg rounded-lg p-6 flex items-center justify-between card-animate">
                        <div className="flex justify-center rounded-md shadow-sm">
                            <button
                                type="button"
                                onClick={() => setMethod('topsis')}
                                className={`px-6 py-2 text-lg font-medium rounded-l-md transition-all duration-150 ease-in-out ${method === 'topsis'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                TOPSIS
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('saw')}
                                className={`px-6 py-2 text-lg font-medium transition-all duration-150 ease-in-out ${method === 'saw'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                SAW
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('saw-topsis')}
                                className={`px-6 py-2 text-lg font-medium rounded-r-md transition-all duration-150 ease-in-out ${method === 'saw-topsis'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                SAW + TOPSIS
                            </button>
                        </div>
                        <div>
                            {error && (
                                <p className="text-red-600 font-semibold">{error}</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-md shadow-md transition-all duration-150
                                       hover:bg-blue-700
                                       disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Calculating...' : `Calculate ${method.toUpperCase()}`}
                        </button>
                    </div>

                </form>

                {results && (
                    <div className="w-full max-w-7xl mx-auto bg-white shadow-lg rounded-lg mt-6" ref={resultsRef}>
                        <h2 className="text-2xl font-semibold text-gray-700 p-6 border-b border-gray-200">
                            Calculation Results ({results.method.toUpperCase()})
                        </h2>

                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">Rankings</h3>
                            <table className="min-w-full divide-y divide-gray-200 border">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alternative</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.scores.sort((a, b) => b.score - a.score)
                                        .map((item, index) => (
                                            <tr key={item.name} className={index === 0 ? 'bg-green-50' : ''}>
                                                <td className="px-4 py-4 text-lg font-bold">{index + 1}</td>
                                                <td className="px-4 py-4 text-lg">{item.name}</td>
                                                <td className="px-4 py-4 text-lg font-medium">{item.score.toFixed(4)}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                    </div>
                )}
            </div>
        </>
    );
}
