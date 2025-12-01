import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileImage, 
  Brain, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Loader,
  Info,
  AlertCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/models`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      setModels(response.data.models);
      if (response.data.models.length > 0) {
        setSelectedModel(response.data.models[0]);
      }
    } catch (err) {
      setError('Failed to fetch models. Make sure the backend is running.');
      console.error(err);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePredict = async () => {
    if (!selectedFile || !selectedModel) {
      setError('Please select both a model and an image');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/predict/${selectedModel.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'ngrok-skip-browser-warning': 'true'
          },
        }
      );
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to make prediction. Please try again.'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Glassmorphism */}
      <header className="backdrop-blur-md bg-white/70 shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-2xl">
                  <Activity size={32} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Pneumonia Detection AI
                </h1>
                <p className="text-slate-600 mt-1 text-sm font-medium">
                  Advanced deep learning powered chest X-ray analysis
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-200">
              <Sparkles size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-green-700">AI Powered</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Model Selection with Cards */}
          <section className="backdrop-blur-md bg-white/80 rounded-3xl shadow-2xl border border-white/20 p-8 transform transition-all hover:shadow-3xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                <Brain size={28} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Select AI Model</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {models.map((model) => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`
                    group relative overflow-hidden border-2 rounded-2xl p-6 cursor-pointer 
                    transition-all duration-500 transform hover:scale-[1.02]
                    ${selectedModel?.id === model.id 
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 shadow-xl' 
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg'
                    }
                  `}
                >
                  {/* Animated background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-800">{model.name}</h3>
                      {selectedModel?.id === model.id && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold">
                          <CheckCircle size={16} />
                          <span>Selected</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-slate-600 mb-6 leading-relaxed">{model.description}</p>
                    
                    <div className="space-y-4 border-t border-slate-200 pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-100 rounded-lg flex-shrink-0">
                          <TrendingUp size={14} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Architecture</p>
                          <p className="text-sm text-slate-700">{model.architecture}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-100 rounded-lg flex-shrink-0">
                          <Brain size={14} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Training</p>
                          <p className="text-sm text-slate-700">{model.training}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-100 rounded-lg flex-shrink-0">
                          <Info size={14} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Parameters</p>
                          <p className="text-sm text-slate-700">{model.parameters}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Image Upload Section with Modern Design */}
          <section className="backdrop-blur-md bg-white/80 rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                <FileImage size={28} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Upload Chest X-Ray</h2>
            </div>

            {!preview ? (
              <label className="block cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="relative border-3 border-dashed border-slate-300 rounded-2xl p-16 text-center transition-all duration-300 group-hover:border-indigo-500 group-hover:bg-gradient-to-br group-hover:from-indigo-50/50 group-hover:to-purple-50/50 overflow-hidden">
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-purple-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative">
                    <div className="inline-flex p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Upload size={56} className="text-indigo-600" strokeWidth={2} />
                    </div>
                    <p className="text-xl font-bold text-slate-800 mb-3">
                      Drop your X-ray image here
                    </p>
                    <p className="text-slate-500 mb-2">or click to browse</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full mt-4">
                      <FileImage size={16} className="text-slate-600" />
                      <span className="text-sm text-slate-600 font-medium">PNG, JPG, JPEG (MAX. 10MB)</span>
                    </div>
                  </div>
                </div>
              </label>
            ) : (
              <div className="space-y-6">
                {/* Image Preview with Modern Frame */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-slate-900 rounded-2xl p-4 overflow-hidden">
                    <img 
                      src={preview} 
                      alt="X-ray Preview" 
                      className="w-full h-auto max-h-[500px] object-contain rounded-xl"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleReset}
                    className="group relative px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg"
                  >
                    <XCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>Upload Different Image</span>
                  </button>
                  
                  <button
                    onClick={handlePredict}
                    disabled={loading}
                    className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:shadow-2xl hover:scale-105 disabled:hover:scale-100"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={24} />
                        <span className="text-lg">Analyzing X-Ray...</span>
                      </>
                    ) : (
                      <>
                        <Brain size={24} className="group-hover:scale-110 transition-transform" />
                        <span className="text-lg">Analyze X-Ray</span>
                      </>
                    )}
                    
                    {/* Shine effect */}
                    {!loading && (
                      <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Error Display with Icon */}
          {error && (
            <div className="backdrop-blur-md bg-red-50/90 border-2 border-red-200 rounded-2xl p-6 flex items-start gap-4 shadow-lg animate-shake">
              <div className="flex-shrink-0 p-2 bg-red-100 rounded-xl">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 mb-1">Analysis Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Results Section with Stunning Design */}
          {result && (
            <section className="backdrop-blur-md bg-white/80 rounded-3xl shadow-2xl border border-white/20 p-8 animate-fadeIn">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                  <Activity size={28} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Analysis Results</h2>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
                {/* Main Result Display */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 pb-8 border-b-2 border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className={`
                      relative px-8 py-4 rounded-2xl font-bold text-2xl uppercase tracking-wider shadow-lg
                      ${result.prediction === 'PNEUMONIA' 
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      }
                    `}>
                      {result.prediction === 'PNEUMONIA' ? (
                        <div className="flex items-center gap-3">
                          <XCircle size={28} />
                          <span>Pneumonia</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <CheckCircle size={28} />
                          <span>Normal</span>
                        </div>
                      )}
                      
                      {/* Glow effect */}
                      <div className={`
                        absolute inset-0 rounded-2xl blur-xl opacity-50
                        ${result.prediction === 'PNEUMONIA' ? 'bg-red-500' : 'bg-green-500'}
                      `}></div>
                    </div>
                  </div>
                  
                  <div className="text-center md:text-right">
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Confidence Level</p>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {result.confidence.toFixed(1)}%
                      </div>
                      <TrendingUp size={32} className="text-indigo-600" />
                    </div>
                  </div>
                </div>

                {/* Model Info */}
                <div className="flex items-center justify-center gap-3 mb-8 pb-8 border-b border-slate-200">
                  <Brain size={20} className="text-indigo-600" />
                  <span className="text-slate-600 font-medium">
                    Model: <span className="font-bold text-slate-800">{result.model}</span>
                  </span>
                </div>

                {/* Class Probabilities with Beautiful Bars */}
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Activity size={24} className="text-indigo-600" />
                    Detailed Probabilities
                  </h3>
                  
                  <div className="space-y-6">
                    {Object.entries(result.probabilities).map(([className, probability]) => (
                      <div key={className} className="group">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-3 h-3 rounded-full
                              ${className === 'PNEUMONIA' ? 'bg-red-500' : 'bg-green-500'}
                            `}></div>
                            <span className={`
                              font-bold text-lg
                              ${className === 'PNEUMONIA' ? 'text-red-700' : 'text-green-700'}
                            `}>
                              {className}
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-slate-800">
                            {probability.toFixed(2)}%
                          </span>
                        </div>
                        
                        <div className="relative h-6 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`
                              h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden
                              ${className === 'PNEUMONIA' 
                                ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                                : 'bg-gradient-to-r from-green-500 to-emerald-600'
                              }
                            `}
                            style={{ width: `${probability}%` }}
                          >
                            {/* Animated shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleReset}
                  className="group relative w-full mt-10 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-2xl hover:scale-[1.02] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Sparkles size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                    Analyze Another Image
                  </span>
                  
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

  {/* Modern Footer */}
        <footer className="backdrop-blur-md bg-white/70 shadow-inner mt-16 border-t border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <AlertCircle size={18} className="text-amber-600" />
                <p className="text-amber-700 font-semibold text-sm">
                  Educational Purpose Only - Not for Medical Diagnosis
                </p>
              </div>
              <p className="text-slate-600 text-sm mb-3 max-w-2xl mx-auto">
                This system is designed for academic research and learning purposes. 
                Always consult qualified healthcare professionals for medical advice and diagnosis.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <span>Powered by</span>
                <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  DenseNet & PyTorch
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

export default App;