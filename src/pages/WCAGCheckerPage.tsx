import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { URLInput } from '../components/URLInput';
import { ResultsSummary } from '../components/ResultsSummary';
import { IssuesList } from '../components/IssuesList';
import { RegionSelector } from '../components/RegionSelector';
import { EmbedBadge } from '../components/EmbedBadge';
import { testAccessibility } from '../utils/accessibilityTester';
import type { TestResult } from '../types';
import { exportToPDF } from '../utils/pdfExport';
import { 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Scale, 
  Award,
  FileSearch,
  Zap,
  Globe,
  Shield,
  BookOpen,
  ArrowRight,
  Palette
} from 'lucide-react';

type TabType = 'issues' | 'warnings' | 'passes' | 'contrast';

export function WCAGCheckerPage() {
  const [selectedRegion, setSelectedRegion] = useState('eu');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('issues');

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const testResults = await testAccessibility(url, selectedRegion);
      setResults(testResults);
      
      // Check if there are color contrast issues
      const hasContrastIssues = testResults.issues.some(issue => 
        issue.id === 'color-contrast' || issue.wcagCriteria.includes('1.4.3')
      );
      
      if (hasContrastIssues) {
        setActiveTab('contrast');
      } else if (testResults.issues.length > 0) {
        setActiveTab('issues');
      } else if (testResults.warnings.length > 0) {
        setActiveTab('warnings');
      } else {
        setActiveTab('passes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while testing the URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (results) {
      exportToPDF(results);
    }
  };

  const getContrastIssues = () => {
    if (!results) return [];
    return results.issues.filter(issue => 
      issue.id === 'color-contrast' || issue.wcagCriteria.includes('1.4.3')
    );
  };

  const getNonContrastIssues = () => {
    if (!results) return [];
    return results.issues.filter(issue => 
      issue.id !== 'color-contrast' && !issue.wcagCriteria.includes('1.4.3')
    );
  };

  const getTabStyle = (tab: TabType) => {
    const baseStyle = "px-6 py-3 text-sm font-medium rounded-lg transition-colors border";
    if (activeTab === tab) {
      switch (tab) {
        case 'contrast':
          return `${baseStyle} border-purple-500 text-purple-700 bg-purple-50`;
        case 'issues':
          return `${baseStyle} border-red-500 text-red-700 bg-red-50`;
        case 'warnings':
          return `${baseStyle} border-amber-500 text-amber-700 bg-amber-50`;
        case 'passes':
          return `${baseStyle} border-emerald-500 text-emerald-700 bg-emerald-50`;
      }
    }
    return `${baseStyle} border-gray-300 text-gray-600 hover:bg-gray-50`;
  };

  const contrastIssues = getContrastIssues();
  const nonContrastIssues = getNonContrastIssues();

  return (
    <div className="page-container">
      <div className="content-container">
        {/* URL Input Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              WCAG 2.1 Accessibility Checker
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Test your website against WCAG 2.1 standards
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <RegionSelector
              selectedRegion={selectedRegion}
              onRegionChange={setSelectedRegion}
            />
            <div className="mt-6">
              <URLInput onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </motion.div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-start bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Testing URL</h3>
                <p className="mt-1 text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    <a href={results.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {results.url}
                    </a>
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </button>
              </div>

              <ResultsSummary results={results} />

              {results.issues.length === 0 && results.warnings.length === 0 ? (
                <div className="text-center py-8 bg-green-50 rounded-xl mt-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-6">
                    Congratulations! No accessibility issues found
                  </h3>
                  <EmbedBadge url={results.url} timestamp={results.timestamp} />
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {contrastIssues.length > 0 && (
                      <button
                        onClick={() => setActiveTab('contrast')}
                        className={getTabStyle('contrast')}
                      >
                        <Palette className="w-4 h-4 inline-block mr-2" />
                        Color Contrast ({contrastIssues.length})
                      </button>
                    )}
                    {nonContrastIssues.length > 0 && (
                      <button
                        onClick={() => setActiveTab('issues')}
                        className={getTabStyle('issues')}
                      >
                        Issues ({nonContrastIssues.length})
                      </button>
                    )}
                    {results.warnings.length > 0 && (
                      <button
                        onClick={() => setActiveTab('warnings')}
                        className={getTabStyle('warnings')}
                      >
                        Warnings ({results.warnings.length})
                      </button>
                    )}
                    {results.passes.length > 0 && (
                      <button
                        onClick={() => setActiveTab('passes')}
                        className={getTabStyle('passes')}
                      >
                        Passed ({results.passes.length})
                      </button>
                    )}
                  </div>

                  <div>
                    {activeTab === 'contrast' && contrastIssues.length > 0 && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-purple-900 mb-2">
                            Color Contrast Issues
                          </h3>
                          <p className="text-purple-700">
                            WCAG 2.1 requires a contrast ratio of at least:
                          </p>
                          <ul className="mt-2 space-y-1 text-purple-700">
                            <li>• 4.5:1 for normal text</li>
                            <li>• 3:1 for large text (18pt or 14pt bold)</li>
                            <li>• 3:1 for graphical objects and user interface components</li>
                          </ul>
                        </div>
                        <IssuesList issues={contrastIssues} type="issues" />
                      </div>
                    )}
                    {activeTab === 'issues' && nonContrastIssues.length > 0 && (
                      <IssuesList issues={nonContrastIssues} type="issues" />
                    )}
                    {activeTab === 'warnings' && results.warnings.length > 0 && (
                      <IssuesList issues={results.warnings} type="warnings" />
                    )}
                    {activeTab === 'passes' && results.passes.length > 0 && (
                      <IssuesList issues={results.passes} type="passes" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Features Section - Only show when no results */}
        {!results && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <FileSearch className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Deep Analysis
              </h3>
              <p className="text-gray-600">
                Thorough scanning of HTML, ARIA, and dynamic content
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <Zap className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI-Powered Fixes
              </h3>
              <p className="text-gray-600">
                Get instant suggestions with code examples
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <Globe className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Global Standards
              </h3>
              <p className="text-gray-600">
                Support for WCAG, ADA, and Section 508
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}