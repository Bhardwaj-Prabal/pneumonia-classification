import React, { useState, useRef, useEffect } from 'react';
import { Upload, Activity, Info, CheckCircle, AlertCircle, Loader, X, FileImage, BarChart3, Stethoscope } from 'lucide-react';

const PneumoniaClassifier = () => {
  const [mode, setMode] = useState('single'); // 'single' or 'batch'
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [health, setHealth] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // API base URL - adjust this to your backend URL
  const API_URL = 'http://localhost:6798';

  // Fetch health status on mount
  useEffect(() => {
    fetchHealth();
    fetchModelInfo();
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const fetchModelInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/model-info`);
      const data = await response.json();
      setModelInfo(data);
    } catch (error) {
      console.error('Model info fetch failed:', error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    if (mode === 'single' && newFiles.length > 0) {
      setFiles([newFiles[0]]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews([reader.result]);
      };
      reader.readAsDataURL(newFiles[0]);
    } else if (mode === 'batch') {
      const limitedFiles = newFiles.slice(0, 50);
      setFiles(limitedFiles);
      
      const newPreviews = [];
      limitedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result);
          if (newPreviews.length === limitedFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    setResult(null);
    setBatchResults(null);
  };

  const predictSingle = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Prediction failed');
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Prediction error:', error);
      alert('Prediction failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const predictBatch = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_URL}/predict-batch`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Batch prediction failed');
      
      const data = await response.json();
      setBatchResults(data);
    } catch (error) {
      console.error('Batch prediction error:', error);
      alert('Batch prediction failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setPreviews([]);
    setResult(null);
    setBatchResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const ConfidenceBar = ({ label, value, color }) => (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{(value * 100).toFixed(2)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl shadow-lg">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Pneumonia Detection System</h1>
                <p className="text-sm text-gray-600 mt-1">AI-Powered Chest X-Ray Analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {health && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  health.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-medium">{health.status.toUpperCase()}</span>
                </div>
              )}
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Info className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Model Info Panel */}
      {showInfo && modelInfo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Model Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Architecture:</span>
                <span className="ml-2 text-blue-900">{modelInfo.model_architecture}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Input Size:</span>
                <span className="ml-2 text-blue-900">{modelInfo.input_size}</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Parameters:</span>
                <span className="ml-2 text-blue-900">{modelInfo.parameters?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex">
            <button
              onClick={() => { setMode('single'); resetUpload(); }}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'single'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => { setMode('batch'); resetUpload(); }}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                mode === 'batch'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Batch Analysis
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Upload className="w-6 h-6 mr-2 text-blue-600" />
              Upload {mode === 'batch' ? 'Images' : 'Image'}
            </h2>

            {files.length === 0 ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-3 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop {mode === 'batch' ? 'images' : 'image'} here or click to upload
                </p>
                <p className="text-sm text-gray-500">
                  {mode === 'batch' ? 'Upload up to 50 images' : 'PNG, JPG, JPEG supported'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple={mode === 'batch'}
                  onChange={handleFileInput}
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    {files.length} {mode === 'batch' ? 'images' : 'image'} selected
                  </span>
                  <button
                    onClick={resetUpload}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </button>
                </div>

                <div className={`grid ${mode === 'batch' ? 'grid-cols-3' : 'grid-cols-1'} gap-4 mb-6 max-h-96 overflow-y-auto`}>
                  {previews.map((preview, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden shadow-md">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-48 object-cover" />
                    </div>
                  ))}
                </div>

                <button
                  onClick={mode === 'single' ? predictSingle : predictBatch}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Analyze {mode === 'batch' ? 'Images' : 'Image'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              Results
            </h2>

            {!result && !batchResults && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Activity className="w-20 h-20 mb-4" />
                <p className="text-lg">No results yet</p>
                <p className="text-sm">Upload and analyze an image to see results</p>
              </div>
            )}

            {/* Single Result */}
            {result && (
              <div className="space-y-6">
                <div className={`p-6 rounded-xl border-2 ${
                  result.prediction === 'PNEUMONIA'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">Diagnosis</span>
                    {result.prediction === 'PNEUMONIA' ? (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <p className={`text-3xl font-bold mb-2 ${
                    result.prediction === 'PNEUMONIA' ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {result.prediction}
                  </p>
                  <p className="text-sm text-gray-600">
                    Confidence: {(result.confidence * 100).toFixed(2)}%
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Probability Distribution</h3>
                  <ConfidenceBar
                    label="Normal"
                    value={result.probabilities.NORMAL}
                    color="bg-gradient-to-r from-green-400 to-green-600"
                  />
                  <ConfidenceBar
                    label="Pneumonia"
                    value={result.probabilities.PNEUMONIA}
                    color="bg-gradient-to-r from-red-400 to-red-600"
                  />
                </div>

                <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded-lg">
                  <p>Device: {result.device_used}</p>
                  <p>Model: {result.model_architecture}</p>
                </div>
              </div>
            )}

            {/* Batch Results */}
            {batchResults && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-blue-600">{batchResults.total_images}</p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{batchResults.summary.normal}</p>
                      <p className="text-sm text-gray-600">Normal</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-red-600">{batchResults.summary.pneumonia}</p>
                      <p className="text-sm text-gray-600">Pneumonia</p>
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {batchResults.results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        res.prediction === 'PNEUMONIA'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm truncate">{res.filename}</p>
                          <p className={`text-lg font-bold ${
                            res.prediction === 'PNEUMONIA' ? 'text-red-700' : 'text-green-700'
                          }`}>
                            {res.prediction}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{(res.confidence * 100).toFixed(1)}%</p>
                          <p className="text-xs text-gray-600">confidence</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
             This tool is for educational purposes only. Always consult with healthcare professionals for medical diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PneumoniaClassifier;