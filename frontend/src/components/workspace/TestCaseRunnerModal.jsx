import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
  Info
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { generateTestHarness } from '../../utils/testHarnessGenerator';
import { evaluateTestCase } from '../../utils/testComparator';
import { resolveTargetFunction } from '../../utils/testFunctionExtractor';

export const TestCaseRunnerModal = ({
  isOpen,
  onClose,
  activeFile,
  activeLanguage,
  selectedCode = '',
  fullFileContent = '',
  workspaceId = null,
  authToken = null
}) => {
  // Target Function Resolution State
  const [resolvedState, setResolvedState] = useState(null);
  const [targetFunction, setTargetFunction] = useState(null);

  // Test Cases State
  const [testCases, setTestCases] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runningCaseId, setRunningCaseId] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  // Preserve user edited test cases on regenerate
  const [preserveEditsOnRegen, setPreserveEditsOnRegen] = useState(true);

  // Initial Target Function Resolution
  useEffect(() => {
    if (!isOpen) return;

    const res = resolveTargetFunction({
      selectedCode,
      fullFileContent,
      language: activeLanguage
    });

    setResolvedState(res);
    setGenerationError(null);

    if (res.status === 'single') {
      setTargetFunction(res.targetFunction);
      fetchAITestCases(res.targetFunction);
    } else {
      setTargetFunction(null);
      setTestCases([]);
    }
  }, [isOpen, selectedCode, fullFileContent, activeLanguage]);

  // Fetch AI Test Cases for target function
  const fetchAITestCases = async (funcObj, isRegenerating = false) => {
    if (!funcObj || isGenerating) return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/ai/tests`,
        {
          code: funcObj.codeSnippet,
          language: activeLanguage,
          context: {
            fileName: activeFile,
            language: activeLanguage,
            content: funcObj.codeSnippet,
            functionName: funcObj.name,
            parameters: funcObj.parameters
          },
          workspaceId: workspaceId || null
        },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );

      const rawCases = Array.isArray(response.data?.testCases) ? response.data.testCases : [];

      const formattedCases = rawCases.map((tc, idx) => ({
        id: `tc-${idx}-${Date.now()}`,
        selected: true,
        name: tc.description || tc.name || `Case ${idx + 1}`,
        category: (tc.category || 'normal').toLowerCase(),
        input: tc.input || [],
        inputRawText: JSON.stringify(tc.input || []),
        inputError: null,
        expectedOutput: tc.expectedOutput !== undefined ? tc.expectedOutput : null,
        expectedOutputRawText: JSON.stringify(tc.expectedOutput !== undefined ? tc.expectedOutput : null),
        expectedOutputError: null,
        expectException: Boolean(tc.expectException),
        status: 'IDLE', // 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR' | 'EDITED'
        actualOutput: null,
        actualRaw: '',
        diff: null,
        errorDetails: null,
        consoleLogs: [],
        executionTimeMs: null,
        isCustomEdited: false
      }));

      if (isRegenerating && preserveEditsOnRegen) {
        // Keep user-customized test cases and prepend or append to regenerated list
        setTestCases(prev => {
          const editedCases = prev.filter(c => c.isCustomEdited);
          return [...editedCases, ...formattedCases];
        });
      } else {
        setTestCases(formattedCases);
      }
    } catch (err) {
      console.error('Failed to generate test cases:', err);
      setGenerationError(
        err.response?.data?.message || err.message || 'Failed to generate AI test cases for target function.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Function switch handler from dropdown
  const handleSelectFunction = (funcObj) => {
    setTargetFunction(funcObj);
    fetchAITestCases(funcObj);
  };

  // Toggle selection for a single test case
  const handleToggleSelect = (id) => {
    setTestCases(prev =>
      prev.map(tc => (tc.id === id ? { ...tc, selected: !tc.selected } : tc))
    );
  };

  // Select / Deselect All
  const handleSelectAll = (selectState) => {
    setTestCases(prev => prev.map(tc => ({ ...tc, selected: selectState })));
  };

  // Safe typed JSON parsing helper
  const safeParseJSON = (text) => {
    try {
      const parsed = JSON.parse(text);
      return { success: true, value: parsed, error: null };
    } catch (err) {
      return { success: false, value: null, error: err.message };
    }
  };

  // Handle Input parameter editing with type-preservation
  const handleInputChange = (id, newRawText) => {
    setTestCases(prev =>
      prev.map(tc => {
        if (tc.id !== id) return tc;

        const parseRes = safeParseJSON(newRawText);
        let inputVal = tc.input;
        let inputError = null;

        if (parseRes.success) {
          inputVal = Array.isArray(parseRes.value) ? parseRes.value : [parseRes.value];
        } else {
          inputError = 'Invalid JSON: strings must be quoted (e.g. "abc"), numbers unquoted (100).';
        }

        // Invalidate stale execution results if already run
        const newStatus = tc.status === 'IDLE' ? 'IDLE' : 'EDITED';

        return {
          ...tc,
          inputRawText: newRawText,
          input: inputVal,
          inputError,
          status: newStatus,
          isCustomEdited: true,
          actualOutput: null,
          diff: null,
          errorDetails: null
        };
      })
    );
  };

  // Handle Expected Output editing with type-preservation
  const handleExpectedOutputChange = (id, newRawText) => {
    setTestCases(prev =>
      prev.map(tc => {
        if (tc.id !== id) return tc;

        const parseRes = safeParseJSON(newRawText);
        let expectedVal = tc.expectedOutput;
        let expectedOutputError = null;

        if (parseRes.success) {
          expectedVal = parseRes.value;
        } else {
          expectedOutputError = 'Invalid JSON: e.g. true, false, 42, "text", [1,2], or null.';
        }

        const newStatus = tc.status === 'IDLE' ? 'IDLE' : 'EDITED';

        return {
          ...tc,
          expectedOutputRawText: newRawText,
          expectedOutput: expectedVal,
          expectedOutputError,
          status: newStatus,
          isCustomEdited: true,
          actualOutput: null,
          diff: null,
          errorDetails: null
        };
      })
    );
  };

  // Toggle explicit exception expectation
  const handleToggleExpectException = (id) => {
    setTestCases(prev =>
      prev.map(tc => {
        if (tc.id !== id) return tc;
        return {
          ...tc,
          expectException: !tc.expectException,
          status: tc.status === 'IDLE' ? 'IDLE' : 'EDITED',
          isCustomEdited: true
        };
      })
    );
  };

  // Execute single test case independently
  const executeSingleTestCase = async (tc) => {
    if (!targetFunction) return;

    // Check for syntax errors before running
    if (tc.inputError || tc.expectedOutputError) {
      setTestCases(prev =>
        prev.map(item =>
          item.id === tc.id
            ? {
                ...item,
                status: 'ERROR',
                errorDetails: tc.inputError || tc.expectedOutputError
              }
            : item
        )
      );
      return;
    }

    setTestCases(prev =>
      prev.map(item => (item.id === tc.id ? { ...item, status: 'RUNNING' } : item))
    );
    setRunningCaseId(tc.id);

    try {
      // 1. Synthesize in-memory test harness (Original editor code is NEVER mutated)
      const harnessRes = generateTestHarness({
        code: targetFunction.codeSnippet,
        functionName: targetFunction.name,
        language: activeLanguage,
        inputs: tc.input,
        functionAnalysis: { name: targetFunction.name, parameters: targetFunction.parameters }
      });

      if (!harnessRes.success) {
        setTestCases(prev =>
          prev.map(item =>
            item.id === tc.id
              ? {
                  ...item,
                  status: 'ERROR',
                  errorDetails: harnessRes.error || 'Failed to synthesize test harness for this language/signature.'
                }
              : item
          )
        );
        return;
      }

      // 2. Dispatch to existing /api/execute sandbox endpoint
      const startTime = Date.now();
      const response = await axios.post(
        `${API_BASE}/execute`,
        {
          language: activeLanguage,
          code: harnessRes.code,
          stdin: harnessRes.stdin || '',
          filename: harnessRes.filename,
          workspaceId: workspaceId || null
        },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );

      const execData = response.data || {};
      const elapsedMs = execData.executionTimeMs ?? (Date.now() - startTime);

      // 3. Evaluate output using deep equality comparator & strict error classification
      const evaluated = evaluateTestCase(
        {
          stdout: execData.stdout,
          stderr: execData.stderr,
          compileOutput: execData.compileOutput,
          isCompileError: execData.isCompileError,
          isTimeout: execData.isTimeout,
          exitCode: execData.exitCode,
          executionTimeMs: elapsedMs
        },
        tc
      );

      setTestCases(prev =>
        prev.map(item =>
          item.id === tc.id
            ? {
                ...item,
                status: evaluated.status,
                actualOutput: evaluated.actualOutput,
                actualRaw: evaluated.actualRaw,
                diff: evaluated.diff,
                errorDetails: evaluated.errorDetails,
                consoleLogs: evaluated.consoleLogs || [],
                executionTimeMs: evaluated.executionTimeMs
              }
            : item
        )
      );
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Execution request failed';
      setTestCases(prev =>
        prev.map(item =>
          item.id === tc.id
            ? {
                ...item,
                status: 'ERROR',
                errorDetails: errMsg
              }
            : item
        )
      );
    } finally {
      setRunningCaseId(null);
    }
  };

  // Execute all selected test cases sequentially & independently
  const handleRunSelectedTests = async () => {
    if (isRunningAll || isGenerating) return;

    const selectedCases = testCases.filter(tc => tc.selected);
    if (selectedCases.length === 0) return;

    setIsRunningAll(true);

    for (const tc of selectedCases) {
      await executeSingleTestCase(tc);
    }

    setIsRunningAll(false);
  };

  // Dashboard Metrics Calculation
  const metrics = useMemo(() => {
    const total = testCases.length;
    const selected = testCases.filter(tc => tc.selected).length;
    const executed = testCases.filter(tc => tc.status === 'PASSED' || tc.status === 'FAILED' || tc.status === 'ERROR').length;
    const passed = testCases.filter(tc => tc.status === 'PASSED').length;
    const failed = testCases.filter(tc => tc.status === 'FAILED').length;
    const errors = testCases.filter(tc => tc.status === 'ERROR').length;
    const successPercentage = executed > 0 ? Math.round((passed / executed) * 100) : 0;
    const totalTimeMs = testCases.reduce((acc, tc) => acc + (tc.executionTimeMs || 0), 0);

    return { total, selected, executed, passed, failed, errors, successPercentage, totalTimeMs };
  }, [testCases]);

  // Filtered test cases based on category pill
  const filteredCases = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return testCases;
    return testCases.filter(tc => tc.category === activeCategoryFilter.toLowerCase());
  }, [testCases, activeCategoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(testCases.map(tc => tc.category.toUpperCase()));
    return ['ALL', ...Array.from(set)];
  }, [testCases]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0E0F17] border border-[#2B2E3D] rounded-2xl shadow-2xl overflow-hidden text-gray-200 font-sans">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#13141F] border-b border-[#2B2E3D]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-100 tracking-tight">CodeTrail Test Suite</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                  {activeLanguage}
                </span>
                {targetFunction && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#1F2230] text-emerald-300 border border-emerald-500/30">
                    {targetFunction.signature}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Multi-scenario unit testing, type-safe assertion & cloud sandbox execution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-white/5 transition-colors"
            title="Close test runner (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Multi-Function Selection Dialog (if user code had multiple functions) */}
        {resolvedState?.status === 'multiple' && (
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <Info size={16} className="shrink-0" />
              <span>{resolvedState.message}</span>
            </div>
            <select
              value={targetFunction?.name || ''}
              onChange={(e) => {
                const found = resolvedState.functions.find(f => f.name === e.target.value);
                if (found) handleSelectFunction(found);
              }}
              className="bg-[#1A1D27] border border-amber-500/40 text-amber-200 text-xs rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-amber-400"
            >
              <option value="" disabled>Select Target Function...</option>
              {resolvedState.functions.map(f => (
                <option key={f.name} value={f.name}>
                  {f.signature} (lines {f.startLine}–{f.endLine})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Guidance Notice if No Functions Detected */}
        {resolvedState?.status === 'none' && (
          <div className="p-8 text-center flex flex-col items-center justify-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-base font-semibold text-gray-100 mb-1">No Target Function Detected</h3>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-6">
              {resolvedState.message}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222533] hover:bg-[#2B2F42] text-gray-200 border border-white/10 transition-colors"
            >
              Return to Code Editor
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {resolvedState?.status !== 'none' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Results Dashboard Summary Bar */}
            <div className="px-6 py-3.5 bg-[#10121A] border-b border-[#242735] grid grid-cols-2 md:grid-cols-6 gap-3 shrink-0">
              <div className="bg-[#171924] border border-[#2B2E3D] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-400 uppercase font-mono tracking-wider">Total</span>
                <span className="text-lg font-bold text-gray-100 font-mono mt-0.5">{metrics.total}</span>
              </div>
              <div className="bg-[#171924] border border-[#2B2E3D] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-400 uppercase font-mono tracking-wider">Selected</span>
                <span className="text-lg font-bold text-sky-400 font-mono mt-0.5">{metrics.selected}</span>
              </div>
              <div className="bg-[#171924] border border-[#2B2E3D] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[11px] text-emerald-400 uppercase font-mono tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} /> Passed
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{metrics.passed}</span>
              </div>
              <div className="bg-[#171924] border border-[#2B2E3D] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[11px] text-rose-400 uppercase font-mono tracking-wider flex items-center gap-1">
                  <XCircle size={12} /> Failed
                </span>
                <span className="text-lg font-bold text-rose-400 font-mono mt-0.5">{metrics.failed}</span>
              </div>
              <div className="bg-[#171924] border border-[#2B2E3D] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[11px] text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1">
                  <AlertTriangle size={12} /> Errors
                </span>
                <span className="text-lg font-bold text-amber-400 font-mono mt-0.5">{metrics.errors}</span>
              </div>
              <div className="bg-[#171924] border border-[#2B2E3D] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[11px] text-gray-400 uppercase font-mono tracking-wider">Success Rate</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-lg font-bold font-mono ${metrics.successPercentage >= 80 ? 'text-emerald-400' : metrics.successPercentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {metrics.executed > 0 ? `${metrics.successPercentage}%` : '—'}
                  </span>
                  {metrics.totalTimeMs > 0 && (
                    <span className="text-[10px] text-gray-400 font-mono">({metrics.totalTimeMs}ms)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar & Filter Pills */}
            <div className="px-6 py-2.5 bg-[#141620] border-b border-[#242735] flex items-center justify-between flex-wrap gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-300 hover:text-white hover:bg-white/5 border border-[#303345] transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-300 hover:text-white hover:bg-white/5 border border-[#303345] transition-colors"
                >
                  Deselect All
                </button>

                <div className="h-4 w-px bg-white/10 mx-1" />

                {/* Category Filters */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded-md border transition-all ${
                        activeCategoryFilter === cat
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
                          : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => fetchAITestCases(targetFunction, true)}
                  disabled={isGenerating || isRunningAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#202331] hover:bg-[#282C3D] text-gray-300 border border-white/10 disabled:opacity-50 transition-colors"
                  title="Regenerate test cases using CodeTrail AI"
                >
                  <RotateCcw size={13} className={isGenerating ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>

                <button
                  onClick={handleRunSelectedTests}
                  disabled={isRunningAll || isGenerating || metrics.selected === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all font-mono"
                >
                  {isRunningAll ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-gray-950" />
                      <span>Running ({metrics.selected})...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>Run {metrics.selected} Selected</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner during Generation */}
            {generationError && (
              <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span>{generationError}</span>
                <button
                  onClick={() => fetchAITestCases(targetFunction)}
                  className="underline hover:text-rose-200 ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Scrollable Test Cases List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {isGenerating && testCases.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center my-auto text-gray-400">
                  <Loader2 size={32} className="animate-spin text-emerald-400 mb-3" />
                  <p className="text-sm font-medium text-gray-200">Analyzing function logic & synthesizing test cases...</p>
                  <p className="text-xs text-gray-500 mt-1">Extracting signatures, boundary scenarios, and deterministic outputs</p>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="p-10 text-center text-gray-500 text-xs">
                  No test cases found matching filter "{activeCategoryFilter}".
                </div>
              ) : (
                filteredCases.map((tc, index) => {
                  const isRunningThis = runningCaseId === tc.id;

                  return (
                    <div
                      key={tc.id}
                      className={`border rounded-xl p-4 transition-all ${
                        tc.status === 'PASSED'
                          ? 'bg-[#101918] border-emerald-500/30'
                          : tc.status === 'FAILED'
                          ? 'bg-[#1A1215] border-rose-500/30'
                          : tc.status === 'ERROR'
                          ? 'bg-[#1A1612] border-amber-500/30'
                          : tc.status === 'EDITED'
                          ? 'bg-[#161424] border-purple-500/30'
                          : 'bg-[#141622] border-[#252838] hover:border-[#32364B]'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleToggleSelect(tc.id)}
                            className="text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            {tc.selected ? (
                              <CheckSquare size={16} className="text-emerald-400" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                          <span className="text-xs font-semibold text-gray-200 font-mono">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-medium text-gray-300">
                            {tc.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#1F2232] text-gray-400 border border-white/5">
                            {tc.category}
                          </span>
                          {tc.isCustomEdited && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              CUSTOM
                            </span>
                          )}
                        </div>

                        {/* Status Badge & Run Single Button */}
                        <div className="flex items-center gap-2">
                          {isRunningThis ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">
                              <Loader2 size={12} className="animate-spin" /> RUNNING
                            </span>
                          ) : tc.status === 'PASSED' ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={12} /> PASSED ({tc.executionTimeMs}ms)
                            </span>
                          ) : tc.status === 'FAILED' ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <XCircle size={12} /> FAILED ({tc.executionTimeMs}ms)
                            </span>
                          ) : tc.status === 'ERROR' ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <AlertTriangle size={12} /> ERROR
                            </span>
                          ) : tc.status === 'EDITED' ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <RotateCcw size={11} /> Edited – Rerun Required
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-gray-500 bg-[#1D202D] border border-white/5">
                              IDLE
                            </span>
                          )}

                          <button
                            onClick={() => executeSingleTestCase(tc)}
                            disabled={isRunningAll || isRunningThis}
                            className="p-1.5 rounded-md bg-[#202332] hover:bg-[#2A2E44] text-gray-300 hover:text-emerald-400 transition-colors disabled:opacity-40"
                            title="Run only this test case"
                          >
                            <Play size={12} fill="currentColor" />
                          </button>
                        </div>
                      </div>

                      {/* Editable Inputs & Expected Output Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        {/* Input Arguments Box */}
                        <div>
                          <div className="flex items-center justify-between text-gray-400 mb-1 text-[11px]">
                            <span>INPUT ARGUMENTS:</span>
                            {tc.inputError && (
                              <span className="text-rose-400 text-[10px]">{tc.inputError}</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={tc.inputRawText}
                            onChange={(e) => handleInputChange(tc.id, e.target.value)}
                            className={`w-full px-3 py-1.5 bg-[#0C0D14] border rounded-lg text-gray-100 text-xs focus:outline-hidden ${
                              tc.inputError ? 'border-rose-500/50 focus:border-rose-400' : 'border-[#2C2F40] focus:border-emerald-500/50'
                            }`}
                            placeholder="[4] or [10, 20]"
                          />
                        </div>

                        {/* Expected Output Box */}
                        <div>
                          <div className="flex items-center justify-between text-gray-400 mb-1 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span>EXPECTED RETURN:</span>
                              <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={tc.expectException}
                                  onChange={() => handleToggleExpectException(tc.id)}
                                  className="rounded border-[#303345] text-amber-500 focus:ring-0"
                                />
                                <span>Expect Exception</span>
                              </label>
                            </div>
                            {tc.expectedOutputError && (
                              <span className="text-rose-400 text-[10px]">{tc.expectedOutputError}</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={tc.expectedOutputRawText}
                            onChange={(e) => handleExpectedOutputChange(tc.id, e.target.value)}
                            className={`w-full px-3 py-1.5 bg-[#0C0D14] border rounded-lg text-gray-100 text-xs focus:outline-hidden ${
                              tc.expectedOutputError ? 'border-rose-500/50 focus:border-rose-400' : 'border-[#2C2F40] focus:border-emerald-500/50'
                            }`}
                            placeholder="true, 42, null, or string"
                          />
                        </div>
                      </div>

                      {/* Execution Output, Diff & Error Diagnostics (when executed) */}
                      {tc.status !== 'IDLE' && tc.status !== 'RUNNING' && (
                        <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2">
                          {/* Actual vs Expected output */}
                          <div className="flex items-start gap-2 text-xs font-mono">
                            <span className="text-gray-400 shrink-0 text-[11px]">ACTUAL OUTPUT:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tc.status === 'PASSED'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : tc.status === 'FAILED'
                                ? 'bg-rose-500/10 text-rose-300'
                                : 'bg-amber-500/10 text-amber-300'
                            }`}>
                              {tc.actualRaw !== '' ? tc.actualRaw : 'null'}
                            </span>
                          </div>

                          {/* Diff view on failure */}
                          {tc.diff && (
                            <div className="p-2.5 bg-black/40 border border-rose-500/20 rounded-lg text-xs font-mono text-rose-300 whitespace-pre-wrap">
                              {tc.diff}
                            </div>
                          )}

                          {/* Error diagnostics on error */}
                          {tc.errorDetails && (
                            <div className="p-2.5 bg-black/40 border border-amber-500/20 rounded-lg text-xs font-mono text-amber-300 whitespace-pre-wrap">
                              {tc.errorDetails}
                            </div>
                          )}

                          {/* Extraneous developer console logs */}
                          {tc.consoleLogs && tc.consoleLogs.length > 0 && (
                            <details className="text-[11px] font-mono text-gray-400">
                              <summary className="cursor-pointer hover:text-gray-200">
                                View Console Output ({tc.consoleLogs.length} lines)
                              </summary>
                              <div className="mt-1 p-2 bg-black/50 rounded border border-white/5 text-gray-300 whitespace-pre-wrap">
                                {tc.consoleLogs.join('\n')}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-6 py-3 bg-[#11131C] border-t border-[#242735] flex items-center justify-between text-xs text-gray-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveEditsOnRegen}
                  onChange={(e) => setPreserveEditsOnRegen(e.target.checked)}
                  className="rounded border-[#303345] text-emerald-500 focus:ring-0"
                />
                <span>Preserve custom edited cases when regenerating</span>
              </label>

              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-[#222533] hover:bg-[#2B2F42] text-gray-200 border border-white/10 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default TestCaseRunnerModal;
