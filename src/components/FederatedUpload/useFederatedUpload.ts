import { useMemo, useState } from 'react';
import { ClientUploadState, SummaryPayload, SummaryPayloadClient, SummaryStats } from './types';
import { useLanguage } from '../../i18n/language';

export interface UseFederatedUploadOptions {
  defaultAlpha?: number;
  onRunSummary: (payload: SummaryPayload) => Promise<void>;
  onRunRaw: (datasets: number[][]) => Promise<void>;
  onDataChange?: () => void;
  resultReady?: boolean;
}

export interface UseFederatedUploadResult {
  clientInputs: ClientUploadState[];
  alphaLevel: number;
  summaryError: string | null;
  debugInput: string;
  debugError: string | null;
  isRunning: boolean;
  hasLocalSummary: boolean;
  clientsReady: boolean;
  activeStep: number;
  localSummaryRows: {
    id: string;
    name: string;
    fileName: string;
    summary?: SummaryStats;
    error?: string | null;
  }[];
  handleFileChange: (clientId: string, file: File | null) => void;
  handleAddClient: () => void;
  handleRemoveClient: (clientId: string) => void;
  handleAlphaChange: (value: string) => void;
  setDebugInput: (val: string) => void;
  loadSampleClients: (clients: { name: string; values: number[]; fileName?: string }[]) => void;
  runSummary: () => Promise<void>;
  runDebug: () => Promise<void>;
  uploadHelpText: string;
}

const DEFAULT_DEBUG = '[\n  [0.01, -0.02, 0.0],\n  [0.03, 0.01, -0.01]\n]';

const parseBootstrapNumbers = (text: string): number[] => {
  const matches = text.match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  if (!matches) return [];
  return matches.map((m) => Number(m)).filter((v) => Number.isFinite(v));
};

const computeClientSummary = (values: number[], alphaValue: number): SummaryStats => {
  if (!values.length) {
    return { n: 0, mean: 0, std: 0, ci: [0, 0] };
  }
  const n = values.length;
  const meanVal = values.reduce((acc, v) => acc + v, 0) / n;
  const variance =
    n > 1 ? values.reduce((acc, v) => acc + Math.pow(v - meanVal, 2), 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => {
    if (sorted.length === 1) return sorted[0];
    const clamped = Math.min(Math.max(p, 0), 1);
    const rank = (sorted.length - 1) * clamped;
    const lowerIdx = Math.floor(rank);
    const upperIdx = Math.ceil(rank);
    const weight = rank - lowerIdx;
    if (upperIdx >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lowerIdx] * (1 - weight) + sorted[upperIdx] * weight;
  };
  const lower = percentile(alphaValue / 2);
  const upper = percentile(1 - alphaValue / 2);
  return { n, mean: meanVal, std, ci: [lower, upper] };
};

export const useFederatedUpload = (options: UseFederatedUploadOptions): UseFederatedUploadResult => {
  const { isZh } = useLanguage();
  const { defaultAlpha = 0.05, onRunSummary, onRunRaw, onDataChange, resultReady } = options;
  const [clientInputs, setClientInputs] = useState<ClientUploadState[]>([
    { id: 'client-1', name: 'Client 1', values: [] },
    { id: 'client-2', name: 'Client 2', values: [] },
  ]);
  const [clientCounter, setClientCounter] = useState<number>(3);
  const [alphaLevel, setAlphaLevel] = useState<number>(defaultAlpha);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [debugInput, setDebugInput] = useState<string>(DEFAULT_DEBUG);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const notifyDataChange = () => {
    setSummaryError(null);
    if (onDataChange) onDataChange();
  };

  const updateClientValues = (clientId: string, values: number[], fileName?: string) => {
    notifyDataChange();
    setClientInputs((prev) =>
      prev.map((client) => {
        if (client.id !== clientId) return client;
        if (values.length === 0) {
          return {
            ...client,
            values,
            summary: undefined,
            fileName,
            error: isZh ? '未解析到合法数字' : 'No valid numeric values were found.',
          };
        }
        const summary = computeClientSummary(values, alphaLevel);
        const error = summary.n < 2 ? (isZh ? '客户端数据不足' : 'Insufficient client samples.') : null;
        return { ...client, values, summary, fileName, error };
      })
    );
  };

  const handleFileChange = (clientId: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      const numbers = parseBootstrapNumbers(text);
      updateClientValues(clientId, numbers, file.name);
    };
    reader.readAsText(file);
  };

  const handleAddClient = () => {
    notifyDataChange();
    setClientInputs((prev) => [
      ...prev,
      { id: `client-${clientCounter}`, name: `Client ${clientCounter}`, values: [] },
    ]);
    setClientCounter((prev) => prev + 1);
  };

  const handleRemoveClient = (clientId: string) => {
    notifyDataChange();
    setClientInputs((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== clientId)));
  };

  const handleAlphaChange = (value: string) => {
    const parsed = parseFloat(value);
    const nextAlpha = !Number.isFinite(parsed) || parsed <= 0 || parsed >= 1 ? defaultAlpha : parsed;
    setAlphaLevel(nextAlpha);
    notifyDataChange();
    setClientInputs((prev) =>
      prev.map((client) =>
        client.values.length > 0
          ? (() => {
              const summary = computeClientSummary(client.values, nextAlpha);
              return {
                ...client,
                summary,
                error: summary.n < 2 ? (isZh ? '客户端数据不足' : 'Insufficient client samples.') : null,
              };
            })()
          : client
      )
    );
  };

  const buildSummaryPayload = (): SummaryPayload => ({
    clients: clientInputs.map<SummaryPayloadClient>((client) => ({
      id: client.name,
      n: client.summary?.n || 0,
      mean: client.summary?.mean || 0,
      std: client.summary?.std || 0,
      ci: client.summary?.ci || [0, 0],
    })),
    alpha: alphaLevel,
  });

  const runSummary = async () => {
    const missing = clientInputs.find((c) => !c.summary || c.summary.n < 2 || c.error);
    if (missing) {
      setSummaryError(
        missing.error ||
          (isZh
            ? '请为所有客户端上传至少 2 个样本的文本文件'
            : 'Please upload text files with at least 2 samples for every client.')
      );
      return;
    }
    if (clientInputs.length === 0) {
      setSummaryError(isZh ? '请先添加至少一个客户端数据' : 'Please add at least one client.');
      return;
    }
    try {
      setSummaryError(null);
      setIsRunning(true);
      await onRunSummary(buildSummaryPayload());
    } catch (err: any) {
      setSummaryError(
        err?.message ||
          (isZh
            ? '计算失败，请检查输入格式或数据文件。'
            : 'Computation failed. Please check the input format or data files.')
      );
    } finally {
      setIsRunning(false);
    }
  };

  const runDebug = async () => {
    try {
      setDebugError(null);
      setIsRunning(true);
      const parsed = JSON.parse(debugInput);
      if (!Array.isArray(parsed) || parsed.some((c: any) => !Array.isArray(c))) {
        throw new Error(
          isZh
            ? '请提供二维数组，例如 [[0.01,-0.02,0.0],[...]]'
            : 'Please provide a 2D array, for example [[0.01, -0.02, 0.0], [...]].'
        );
      }
      const sanitized = (parsed as any[]).map((arr, idx) => {
        if (!Array.isArray(arr)) {
          throw new Error(
            isZh ? `第 ${idx + 1} 个客户端数据格式错误` : `Client ${idx + 1} has an invalid data format.`
          );
        }
        const numbers = arr
          .map((v: any) => Number(v))
          .filter((v: number) => Number.isFinite(v));
        if (numbers.length < 2) {
          throw new Error(isZh ? '客户端数据不足' : 'Insufficient client samples.');
        }
        return numbers;
      });
      await onRunRaw(sanitized);
    } catch (err: any) {
      setDebugError(
        err?.message ||
          (isZh
            ? '计算失败，请检查输入格式或数据文件。'
            : 'Computation failed. Please check the input format or data files.')
      );
    } finally {
      setIsRunning(false);
    }
  };

  const hasLocalSummary = useMemo(
    () => clientInputs.some((c) => c.summary && c.summary.n > 0),
    [clientInputs]
  );

  const clientsReady = useMemo(
    () => clientInputs.length > 0 && clientInputs.every((c) => c.summary && c.summary.n >= 2 && !c.error),
    [clientInputs]
  );

  const activeStep = useMemo(() => {
    if (resultReady) return 5;
    if (isRunning) return 3;
    if (clientsReady) return 2;
    if (hasLocalSummary) return 1;
    return 0;
  }, [resultReady, isRunning, clientsReady, hasLocalSummary]);

  const localSummaryRows = useMemo(
    () =>
      clientInputs.map((client) => ({
        id: client.id,
        name: client.name,
        fileName: client.fileName || (isZh ? '未上传' : 'Not uploaded'),
        summary: client.summary,
        error: client.error,
      })),
    [clientInputs, isZh]
  );

  const loadSampleClients = (clients: { name: string; values: number[]; fileName?: string }[]) => {
    notifyDataChange();
    const mapped = clients.map((c, idx) => {
      const summary = computeClientSummary(c.values, alphaLevel);
      return {
        id: `client-${idx + 1}`,
        name: c.name || `Client ${idx + 1}`,
        values: c.values,
        summary,
        fileName: c.fileName || 'sample',
        error: summary.n < 2 ? (isZh ? '客户端数据不足' : 'Insufficient client samples.') : null,
      };
    });
    setClientInputs(mapped);
    setClientCounter(clients.length + 1);
  };

  return {
    clientInputs,
    alphaLevel,
    summaryError,
    debugInput,
    debugError,
    isRunning,
    hasLocalSummary,
    clientsReady,
    activeStep,
    localSummaryRows,
    handleFileChange,
    handleAddClient,
    handleRemoveClient,
    handleAlphaChange,
    setDebugInput,
    loadSampleClients,
    runSummary,
    runDebug,
    uploadHelpText: isZh
      ? '支持逗号、空格、换行、字面量 \\n 和中括号混合的 txt；系统会自动提取其中的所有浮点数。'
      : 'Supports txt files with commas, spaces, newlines, literal \\n, and brackets; the system automatically extracts all numeric values.',
  };
};

export default useFederatedUpload;
