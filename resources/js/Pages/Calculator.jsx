import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { animate, createScope, stagger } from 'animejs';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    Sun,
    Moon,
    Upload,
    Calculator as CalcIcon,
    Plus,
    Trash2,
    BarChart3,
    ChevronRight,
    FileSpreadsheet,
    Award
} from 'lucide-react';

const Card = ({ children, className = "", title, icon: Icon, action, darkMode }) => (
    <div className={`rounded-2xl p-6 transition-all duration-500 border card-animate translate-y-8
      ${darkMode
            ? 'bg-slate-800 border-slate-700 shadow-lg shadow-black/20'
            : 'bg-white border-gray-100 shadow-xl shadow-indigo-100/50'
        } ${className}`}>
        {(title || action) && (
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    {Icon && <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Icon size={20} />
                    </div>}
                    {title && <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{title}</h3>}
                </div>
                {action}
            </div>
        )}
        {children}
    </div>
);

const Badge = ({ children, type, darkMode }) => {
    const colors = {
        benefit: darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        cost: darkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
        neutral: darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600',
        primary: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[type] || colors.neutral}`}>
            {children}
        </span>
    );
};

export default function Calculator() {
    const { t, i18n } = useTranslation();

    const [darkMode, setDarkMode] = useState(false);

    const [method, setMethod] = useState('topsis');

    const [criteria, setCriteria] = useState([
        { id: 1, name: 'C1', weight: 40, type: 'benefit' },
        { id: 2, name: 'C2', weight: 30, type: 'cost' },
        { id: 3, name: 'C3', weight: 30, type: 'benefit' },
    ]);

    const [alternatives, setAlternatives] = useState([
        { id: 1, name: 'A1' },
        { id: 2, name: 'A2' },
    ]);

    const [matrix, setMatrix] = useState([
        [70, 80, 90],
        [90, 60, 80],
    ]);

    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [csvFile, setCsvFile] = useState(null);
    const [isCsvLoading, setIsCsvLoading] = useState(false);
    const [csvError, setCsvError] = useState(null);

    const rootRef = useRef(null);
    const resultsRef = useRef(null);

    // useEffect(() => {
    //     // Animate cards on mount
    //     const cards = document.querySelectorAll('.card-animate');
    //     cards.forEach((card, index) => {
    //         setTimeout(() => {
    //             card.classList.remove('opacity-0', 'translate-y-8');
    //             card.classList.add('opacity-100', 'translate-y-0');
    //         }, index * 100);
    //     });
    // }, []);

    // useEffect(() => {
    //     if (results && resultsRef.current) {
    //         // Simple animation replacement for showResults
    //         resultsRef.current.classList.remove('opacity-0', 'translate-y-8');
    //         resultsRef.current.classList.add('opacity-100', 'translate-y-0');

    //         setTimeout(() => {
    //             resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    //         }, 100);
    //     }
    // }, [results]);

    const handleMatrixChange = (altIndex, critIndex, value) => {
        const newMatrix = [...matrix];
        newMatrix[altIndex][critIndex] = parseFloat(value) || 0;
        setMatrix(newMatrix);
    };

    const handleFileSelection = (file) => {
        if (file) {
            setCsvFile(file);
            setCsvError(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0]);
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
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setCriteria(response.data.criteria);
            setAlternatives(response.data.alternatives);
            setMatrix(response.data.matrix);

            toast.success(t('toast.importSuccess') || 'Import Successful');
            setCsvFile(null);

        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                toast.error(`Import failed: ${err.response.data.message}`);
            } else {
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
            console.log(response.data);
            toast.success('Calculation completed!');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
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
            <Toaster position="bottom-right" />

            <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-indigo-500 selection:text-white
        ${darkMode ? 'bg-slate-900 text-slate-200' : 'bg-gray-50 text-gray-800'}`} ref={rootRef}>

                {/* Navbar */}
                <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300
          ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-200'}`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                                <CalcIcon size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                                    {t('calculator.title') || 'SPPK Calculator'}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <div className={`flex items-center p-1 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
                                <button
                                    onClick={() => i18n.changeLanguage('en')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${i18n.language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => i18n.changeLanguage('id')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${i18n.language === 'id' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                                >
                                    ID
                                </button>
                            </div>

                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={`p-2 rounded-full transition-all ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Left Col: Method & Upload */}
                            <div className="space-y-6 lg:col-span-1">
                                <Card title={t('calculator.method') || "Select Method"} icon={CalcIcon} darkMode={darkMode}>
                                    <div className="flex flex-col gap-2">
                                        {['saw', 'topsis', 'saw-topsis'].map((m) => (
                                            <button
                                                type="button"
                                                key={m}
                                                onClick={() => setMethod(m)}
                                                className={`relative p-4 rounded-xl text-left transition-all border-2 flex items-center justify-between group
                                                        ${darkMode ? 'bg-indigo-900/20 hover:bg-indigo-900/30 border-gray-400/50' : 'bg-gray-50 hover:bg-gray-100 border-gray-300'}
                                                        ${method === m
                                                        ? 'border-indigo-800'
                                                        : 'border-2'
                                                    }`}
                                            >
                                                <span className={`font-bold uppercase ${method === m ? 'text-indigo-700 dark:text-indigo-400' : ''}`}>
                                                    {m.replace('-', ' + ')}
                                                </span>
                                                {method === m && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                                            </button>
                                        ))}
                                    </div>
                                </Card>

                                <Card title={t('calculator.importTitle') || "Import Data"} icon={Upload} darkMode={darkMode} className="delay-200">
                                    <div
                                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 relative cursor-pointer group
                                        ${isDragging
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
                                                : darkMode
                                                    ? 'border-slate-600 hover:border-indigo-500 bg-slate-800'
                                                    : 'border-gray-300 hover:border-indigo-500 bg-gray-50'
                                            }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => handleFileSelection(e.target.files[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />

                                        <div className="relative z-10 pointer-events-none">
                                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform
                                                ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}
                                                ${isDragging ? (darkMode ? 'scale-110 bg-indigo-800' : 'scale-110 bg-indigo-400') : 'group-hover:scale-110'}
                                            `}>
                                                <FileSpreadsheet className={`transition-colors ${isDragging ? 'text-indigo-700 dark:text-indigo-300' : 'text-indigo-600 dark:text-indigo-400'}`} />
                                            </div>
                                            <p className={`text-sm font-medium transition-colors ${isDragging ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {csvFile ? csvFile.name : (isDragging ? t('csv.drop') || "Drop file here to upload" : t('csv.select') || "Select a .csv file")}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">{t('csv.dragDrop') || "or drag and drop it here"}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCsvUpload}
                                        disabled={isCsvLoading || !csvFile}
                                        className="mt-4 w-full py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isCsvLoading ? t('csv.uploading') || 'Importing...' : t('csv.upload') || 'Upload Data'}
                                    </button>
                                    {csvError && <p className="text-red-500 text-sm mt-2 text-center">{csvError}</p>}
                                </Card>
                            </div>

                            {/* Right Col: Criteria Builder */}
                            <div className="lg:col-span-2">
                                <Card
                                    title={t('calculator.criteria') || "Criteria Configuration"}
                                    icon={BarChart3}
                                    action={
                                        <Badge type={totalWeight === 100 ? 'benefit' : 'cost'} darkMode={darkMode}>
                                            {t('calculator.totalWeight') || "Total Weight"}: {totalWeight}%
                                        </Badge>
                                    }
                                    darkMode={darkMode}
                                >
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {criteria.map((crit, index) => (
                                            <div key={crit.id} className={`p-4 rounded-xl border transition-all group hover:shadow-md
                        ${darkMode ? 'bg-slate-700/30 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-indigo-200'}`}>

                                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                                    {/* Name Input */}
                                                    <div className="flex-1 w-full">
                                                        <label className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-1 block">{t('calculator.name') || "Name"}</label>
                                                        <input
                                                            type="text"
                                                            value={crit.name}
                                                            onChange={(e) => handleCriteriaChange(index, 'name', e.target.value)}
                                                            className={`w-full p-2 rounded-lg border-2 bg-transparent outline-none transition-colors
                                ${darkMode ? 'border-slate-600 focus:border-indigo-500' : 'border-gray-200 focus:border-indigo-500'}`}
                                                        />
                                                    </div>

                                                    {/* Type Select */}
                                                    <div className="w-full md:w-32">
                                                        <label className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-1 block">{t('calculator.type') || "Type"}</label>
                                                        <div className="relative">
                                                            <select
                                                                value={crit.type}
                                                                onChange={(e) => handleCriteriaChange(index, 'type', e.target.value)}
                                                                className={`w-full p-2 rounded-lg border-2 appearance-none bg-transparent outline-none cursor-pointer
                                  ${darkMode ? 'border-slate-600 focus:border-indigo-500' : 'border-gray-200 focus:border-indigo-500'}`}
                                                            >
                                                                <option value="benefit">Benefit</option>
                                                                <option value="cost">Cost</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Weight Slider */}
                                                    <div className="w-full md:w-1/3">
                                                        <label className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-1 block">{t('calculator.weight') || "Weight"}</label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="100"
                                                                value={crit.weight}
                                                                onChange={(e) => handleCriteriaChange(index, 'weight', e.target.value)}
                                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                            />
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={crit.weight}
                                                                    onChange={(e) => handleCriteriaChange(index, 'weight', e.target.value)}
                                                                    className={`w-16 p-1 pr-4 text-center text-sm font-bold rounded border-2 outline-none transition-colors
                                                                        ${totalWeight > 100 ? 'border-red-200 text-red-600 bg-red-50' :
                                                                            darkMode ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-500' : 'bg-white border-gray-200 text-indigo-600 focus:border-indigo-500'}`}
                                                                />
                                                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs opacity-50">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase tracking-wider opacity-0 mb-1 block">Act</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeCriterion(index)}
                                                            disabled={criteria.length <= 1}
                                                            className={`p-2 rounded-lg transition-colors ${criteria.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-red-100 text-red-500'}`}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                    {/* Delete */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addCriterion}
                                        className={`mt-6 w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all
                      ${darkMode
                                                ? 'border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-900/20'
                                                : 'border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                    >
                                        <Plus size={20} />
                                        {t('calculator.addCriterion') || "Add Criterion"}
                                    </button>
                                </Card>
                            </div>
                        </div>

                        {/* Matrix Section */}
                        <Card title={t('calculator.matrix') || "Decision Matrix"} icon={FileSpreadsheet} darkMode={darkMode}>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                                <table className="w-full border-collapse text-sm text-left">
                                    <thead className={`${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                        <tr>
                                            <th className={`p-4 font-semibold border-b border-r sticky left-0 z-10 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                                                {t('calculator.alternative') || "Alternative"}
                                            </th>
                                            {criteria.map((crit) => (
                                                <th key={crit.id} className={`p-4 font-semibold border-b text-center min-w-[140px]
                          ${darkMode ? 'border-slate-700 text-slate-300' : 'border-gray-200 text-gray-600'}`}>
                                                    <div className="flex flex-col items-center">
                                                        <span>{crit.name}</span>
                                                        <Badge type={crit.type}>{crit.weight}%</Badge>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className={`p-4 font-semibold border-b text-center w-16 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                                                Act
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alternatives.map((alt, altIndex) => (
                                            <tr key={alt.id} className={`group transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-indigo-50/50'}`}>
                                                <td className={`p-3 border-b border-r sticky left-0 z-10
                          ${darkMode ? 'border-slate-700 bg-slate-900 group-hover:bg-slate-800' : 'border-gray-200 bg-white group-hover:bg-indigo-50'}`}>
                                                    <input
                                                        type="text"
                                                        value={alt.name}
                                                        onChange={(e) => handleAlternativeChange(altIndex, 'name', e.target.value)}
                                                        className={`w-full bg-transparent outline-none font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}
                                                    />
                                                </td>
                                                {criteria.map((_, critIndex) => (
                                                    <td key={critIndex} className={`p-3 border-b text-center ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                                                        <input
                                                            type="number"
                                                            value={matrix[altIndex][critIndex]}
                                                            onChange={(e) => handleMatrixChange(altIndex, critIndex, e.target.value)}
                                                            className={`w-full text-center bg-transparent outline-none p-2 rounded focus:ring-2 focus:ring-indigo-500
                                ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}
                                                        />
                                                    </td>
                                                ))}
                                                <td className={`p-3 border-b text-center ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAlternative(altIndex)}
                                                        disabled={alternatives.length <= 1}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                type="button"
                                onClick={addAlternative}
                                className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                  ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                            >
                                <Plus size={16} /> {t('calculator.addAlternative') || "Add Alternative"}
                            </button>
                        </Card>

                        {/* Calculate Button */}
                        <div className="flex justify-end p-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-500/30 overflow-hidden transition-all hover:scale-105 hover:shadow-indigo-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <span className="relative flex items-center gap-3">
                                    {isLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Calculating...
                                        </>
                                    ) : (
                                        <>
                                            {t('calculator.calculate') || "Calculate"} {method.toUpperCase().replace('-', ' + ')}
                                            <ChevronRight />
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </form>

                    {/* Results Section */}
                    {results && (
                        <div ref={resultsRef} className="translate-y-8 transition-all duration-700">
                            <Card className={`bg-gradient-to-br ${darkMode ? 'from-slate-800 dark:to-slate-900' : 'from-white to-indigo-50'} overflow-hidden relative`} darkMode={darkMode}>

                                {/* Background Decoration */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-indigo-100 dark:border-slate-700">
                                        <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/30">
                                            <Award size={32} />
                                        </div>
                                        <div>
                                            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {t('calculator.calculationResults') || "Results"}
                                            </h2>
                                            <p className="text-indigo-500 font-medium">
                                                Method: {results.method.toUpperCase().replace('-', ' + ')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Top Winner Banner */}
                                    <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-between">
                                        <div>
                                            <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-1">Best Alternative</p>
                                            <h3 className="text-3xl font-bold">{results.scores.sort((a, b) => b.score - a.score)[0]?.name}</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-indigo-100 text-sm mb-1">Score</p>
                                            <p className="text-3xl font-bold">{results.scores[0]?.score.toFixed(4)}</p>
                                        </div>
                                    </div>

                                    {/* Rankings List */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-12 text-sm font-bold opacity-50 px-4 mb-2 uppercase tracking-wider">
                                            <div className="col-span-2">Rank</div>
                                            <div className="col-span-7">Alternative</div>
                                            <div className="col-span-3 text-right">Score</div>
                                        </div>

                                        {results.scores.sort((a, b) => b.score - a.score).map((item, idx) => (
                                            <div key={idx}
                                                className={`grid grid-cols-12 items-center p-4 rounded-xl border transition-all hover:scale-[1.01]
                                                    ${idx === 0
                                                        ? ' border-emerald-400 shadow-md ring-1 ring-emerald-400/50'
                                                        : darkMode
                                                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                                                            : 'bg-white border-gray-200 hover:bg-white hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="col-span-2 flex items-center gap-2">
                                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                                                        ${idx === 0
                                                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500 dark:text-white'
                                                            : idx === 1
                                                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                                                : idx === 2
                                                                    ? 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                                                                    : 'text-gray-400'
                                                        }`}>
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                                <div className={`col-span-7 font-medium ${idx === 0 ? 'text-lg' : ''}`}>
                                                    {item.name}
                                                    {idx === 0 && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Winner</span>}
                                                </div>
                                                <div className="col-span-3 text-right font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                                    {item.score.toFixed(4)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </main>
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: rgba(156, 163, 175, 0.5);
                        border-radius: 20px;
                    }
                `}</style>
            </div>
        </>
    );
}
