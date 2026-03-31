import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Assessment as AssessmentIcon,
  AutoGraph as AutoGraphIcon,
  DeleteOutline as DeleteOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import HeroBanner from '../components/HeroBanner';
import { InlineMath } from '../components/MathText';
import FlowSteps from '../components/FlowSteps';
import { runD3em } from '../api/d3em';
import { D3emFallbackMode, D3emParams, D3emRequest, D3emResponse } from '../d3em/types';
import { useLanguage } from '../i18n/language';

type ClientInput = {
  id: string;
  name: string;
  contributionSeries: number[];
  vindSeries: number[];
  scosSeries: number[];
  independentAccuracy: string;
  rewardedAccuracy: string;
  contributionFile?: string;
  vindFile?: string;
  scosFile?: string;
  xFile?: string;
  yFile?: string;
  error?: string | null;
};

const defaultParams: D3emParams = {
  beta: 1.2,
  t0: 3,
  gamma: 0.6,
  a: 1.0,
  d: 1.0,
  normalize: true,
};

const defaultClients: ClientInput[] = [
  {
    id: 'c1',
    name: 'Client 1',
    contributionSeries: [],
    vindSeries: [],
    scosSeries: [],
    independentAccuracy: '',
    rewardedAccuracy: '',
  },
  {
    id: 'c2',
    name: 'Client 2',
    contributionSeries: [],
    vindSeries: [],
    scosSeries: [],
    independentAccuracy: '',
    rewardedAccuracy: '',
  },
];

const parseNumbers = (text: string): number[] => {
  const matches = text.match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter((v) => Number.isFinite(v));
};

const buildMechanismSteps = (isZh: boolean) => [
  {
    label: isZh ? '上传摘要' : 'Upload summary',
    symbol: 'Summary',
    help: isZh ? '只传统计序列，不传原始数据' : 'Only aggregated sequences are used; raw data stays local.',
  },
  {
    label: isZh ? '独立贡献' : 'Independent value',
    symbol: 'V_ind',
    help: isZh ? '表示独立价值随时间的趋势' : 'Captures the trend of independent value over time.',
  },
  {
    label: isZh ? '耦合偏置' : 'Coupled bias',
    symbol: 'S_cos',
    help: isZh ? '表示协作耦合/偏置对齐程度' : 'Captures collaborative coupling and bias alignment.',
  },
  {
    label: isZh ? '动态融合' : 'Dynamic fusion',
    symbol: 'α(t)',
    help: isZh ? 'α(t) 动态平衡两类信号' : 'α(t) dynamically balances the two signals.',
  },
  {
    label: isZh ? '平滑稳定' : 'Stabilization',
    symbol: 'EMA',
    help: isZh ? 'EMA 抑制短期波动' : 'EMA suppresses short-term fluctuations.',
  },
  {
    label: isZh ? '激励公平' : 'Incentive fairness',
    symbol: isZh ? '输出' : 'Output',
    help: isZh ? '输出贡献权重与公平指标' : 'Outputs contribution weights and fairness indicators.',
  },
];

const CollaborativeFairness: React.FC = () => {
  const theme = useTheme();
  const { isZh } = useLanguage();
  const mechanismSteps = useMemo(() => buildMechanismSteps(isZh), [isZh]);
  const [clientInputs, setClientInputs] = useState<ClientInput[]>(defaultClients);
  const [clientCounter, setClientCounter] = useState(3);
  const [params, setParams] = useState<D3emParams>(defaultParams);
  const [fallbackMode, setFallbackMode] = useState<D3emFallbackMode>('synthetic_decompose');
  const [isRunning, setIsRunning] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [result, setResult] = useState<D3emResponse | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const loadSampleData = () => {
    const samples = [
      {
        name: 'Client 1',
        contributionSeries: [0.14, 0.15, 0.16, 0.15, 0.17, 0.16, 0.18],
        independentAccuracy: '0.92',
        rewardedAccuracy: '0.915',
      },
      {
        name: 'Client 2',
        contributionSeries: [0.11, 0.1, 0.12, 0.11, 0.12, 0.115, 0.12],
        independentAccuracy: '0.88',
        rewardedAccuracy: '0.885',
      },
      {
        name: 'Client 3',
        contributionSeries: [0.06, 0.08, 0.07, 0.05, 0.065, 0.07, 0.075],
        independentAccuracy: '0.80',
        rewardedAccuracy: '0.83',
      },
    ];
    setClientInputs(
      samples.map((s, idx) => ({
        id: `sample-${idx + 1}`,
        name: s.name,
        contributionSeries: s.contributionSeries,
        vindSeries: [],
        scosSeries: [],
        independentAccuracy: s.independentAccuracy,
        rewardedAccuracy: s.rewardedAccuracy,
        error: null,
      }))
    );
    setClientCounter(samples.length + 1);
    setResult(null);
    setSummaryError(null);
  };

  const handleAddClient = () => {
    setClientInputs((prev) => [
      ...prev,
      {
        id: `c${clientCounter}`,
        name: `Client ${clientCounter}`,
        contributionSeries: [],
        vindSeries: [],
        scosSeries: [],
        independentAccuracy: '',
        rewardedAccuracy: '',
      },
    ]);
    setClientCounter((n) => n + 1);
  };

  const handleRemoveClient = (id: string) => {
    setClientInputs((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClientFieldChange = (id: string, field: keyof ClientInput, value: string | number[]) => {
    setClientInputs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value, error: null } : c))
    );
  };

  const handleSeriesUpload =
    (id: string, field: 'contributionSeries' | 'vindSeries' | 'scosSeries', fileField?: 'contributionFile' | 'vindFile' | 'scosFile') =>
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const numbers = parseNumbers(text);
      handleClientFieldChange(id, field, numbers);
      if (fileField) handleClientFieldChange(id, fileField, file.name);
    };

  const handleScalarUpload =
    (id: string, field: 'independentAccuracy' | 'rewardedAccuracy', fileField?: 'xFile' | 'yFile') =>
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const numbers = parseNumbers(text);
      const val = numbers[0];
      if (val === undefined) {
        handleClientFieldChange(
          id,
          'error',
          isZh ? '上传文件中未找到有效标量。' : 'No valid scalar was found in the uploaded file.'
        );
        return;
      }
      handleClientFieldChange(id, field, val.toString());
      if (fileField) handleClientFieldChange(id, fileField, file.name);
    };

  const inferredT = useMemo(() => {
    const lengths = clientInputs
      .map((client) => [client.contributionSeries.length, client.vindSeries.length, client.scosSeries.length])
      .map((arr) => arr.filter((len) => len > 0))
      .filter((arr) => arr.length > 0)
      .map((arr) => Math.min(...arr));
    if (!lengths.length) return 0;
    return Math.min(...lengths);
  }, [clientInputs]);

  const buildPayload = (): { payload: D3emRequest; inferredT: number } => {
    if (clientInputs.length < 2) {
      throw new Error(
        isZh
          ? '协作公平性评估至少需要 2 个客户端。'
          : 'At least 2 clients are required for collaborative fairness.'
      );
    }

    let hasError = false;
    const updated = clientInputs.map((client) => {
      const seriesLengths = [
        client.contributionSeries.length,
        client.vindSeries.length,
        client.scosSeries.length,
      ].filter((len) => len > 0);
      let error: string | null = null;
      if (!seriesLengths.length) {
        error = isZh ? '请提供 contribution_series 或 V_ind/S_cos。' : 'Provide contribution_series or V_ind/S_cos.';
      } else if (seriesLengths.some((len) => len < 2)) {
        error = isZh ? '每条序列至少需要 2 个点。' : 'Each series needs at least 2 points.';
      } else if (new Set(seriesLengths).size > 1) {
        error = isZh ? '同一客户端内的序列长度不一致。' : 'Series length mismatch within this client.';
      }
      const xVal = parseNumbers(client.independentAccuracy)[0];
      const yVal = parseNumbers(client.rewardedAccuracy)[0];
      if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) {
        error = error
          ? `${error} ${isZh ? 'X/Y 必须是有效数字。' : 'X/Y must be valid numbers.'}`
          : isZh
            ? 'X/Y 必须是有效数字。'
            : 'X/Y must be valid numbers.';
      }
      if (error) hasError = true;
      return { ...client, error };
    });

    setClientInputs(updated);
    if (hasError) {
      throw new Error(isZh ? '请先修正已标出的客户端输入。' : 'Please fix the highlighted client inputs.');
    }

    const normalizedClients = updated.map((client) => ({
      clientId: client.name.trim() || client.id,
      vind: client.vindSeries.length ? client.vindSeries : null,
      scos: client.scosSeries.length ? client.scosSeries : null,
      contrib: client.contributionSeries.length ? client.contributionSeries : null,
      X: parseNumbers(client.independentAccuracy)[0],
      Y: parseNumbers(client.rewardedAccuracy)[0],
    }));

    const lengths = normalizedClients.map((client) => {
      const lens = [client.vind?.length, client.scos?.length, client.contrib?.length].filter(
        (len): len is number => typeof len === 'number' && len > 0
      );
      return Math.min(...lens);
    });
    const baseT = Math.min(...lengths);
    if (new Set(lengths).size > 1) {
      throw new Error(
        isZh
          ? `所有客户端的序列长度必须一致（当前为：${lengths.join(', ')}）。`
          : `All clients must share the same series length (current: ${lengths.join(', ')}).`
      );
    }

    return {
      payload: {
        T: baseT,
        params,
        clients: normalizedClients,
        fallbackMode,
      },
      inferredT: baseT,
    };
  };

  const handleRun = async () => {
    setSummaryError(null);
    setIsRunning(true);
    setResult(null);
    try {
      const { payload } = buildPayload();
      const resp: D3emResponse = await runD3em(payload);
      setResult(resp);
    } catch (err: any) {
      setSummaryError(err?.message || (isZh ? 'D3EM 计算失败，请检查输入。' : 'D3EM computation failed. Please check the inputs.'));
    } finally {
      setIsRunning(false);
    }
  };

  const clientIds = useMemo(() => {
    if (result) return Object.keys(result.perClient);
    return clientInputs.map((c) => c.name.trim() || c.id);
  }, [result, clientInputs]);

  useEffect(() => {
    if (!selectedClientId && clientIds[0]) {
      setSelectedClientId(clientIds[0]);
    }
    if (selectedClientId && !clientIds.includes(selectedClientId) && clientIds[0]) {
      setSelectedClientId(clientIds[0]);
    }
  }, [clientIds, selectedClientId]);

  const activeClientId = selectedClientId && clientIds.includes(selectedClientId) ? selectedClientId : clientIds[0] || '';
  const selectedClient = activeClientId ? result?.perClient[activeClientId] : undefined;

  const buildSafeData = <T,>(builder: () => T, fallback: T, label: string) => {
    try {
      return { data: builder(), error: null as string | null };
    } catch (err) {
      return {
        data: fallback,
        error: isZh ? `${label} 渲染失败，请检查输入数据。` : `${label} failed to render. Please check the input data.`,
      };
    }
  };

  const alphaDataResult = useMemo(
    () =>
      buildSafeData(
        () => (result ? result.alpha.map((value, index) => ({ t: index, alpha: value })) : []),
        [],
        'alpha(t)'
      ),
    [result]
  );

  const seriesDataResult = useMemo(
    () =>
      buildSafeData(
        () =>
          selectedClient
            ? selectedClient.c_tilde.map((value, index) => ({
                t: index,
                V_ind: selectedClient.vind[index],
                S_cos: selectedClient.scos[index],
                C_tilde: value,
                C_ema: selectedClient.c_ema[index],
              }))
            : [],
        [],
        isZh ? '融合曲线' : 'Fusion series'
      ),
    [isZh, selectedClient]
  );

  const weightDataResult = useMemo(
    () =>
      buildSafeData(() => {
        if (!result) return [];
        const ids = Object.keys(result.perClient);
        const rows = [] as Array<Record<string, number>>;
        for (let t = 0; t < result.alpha.length; t += 1) {
          const row: Record<string, number> = { t };
          ids.forEach((id) => {
            row[id] = result.perClient[id].c_norm[t];
          });
          rows.push(row);
        }
        return rows;
      }, [], isZh ? '权重演化' : 'Weight evolution'),
    [isZh, result]
  );

  const rewardAvgDataResult = useMemo(
    () =>
      buildSafeData(
        () =>
          result
            ? Object.entries(result.perClient).map(([clientId, data]) => ({
                clientId,
                rho_avg: data.rho_avg,
                c_avg: data.c_avg,
              }))
            : [],
        [],
        isZh ? '激励均值' : 'Average incentives'
      ),
    [isZh, result]
  );

  const rhoSeriesDataResult = useMemo(
    () =>
      buildSafeData(
        () => (selectedClient ? selectedClient.rho.map((value, index) => ({ t: index, rho: value })) : []),
        [],
        isZh ? '激励序列' : 'Incentive series'
      ),
    [isZh, selectedClient]
  );

  const scatterDataResult = useMemo(
    () =>
      buildSafeData(
        () => (result?.fairness.points ? result.fairness.points : []),
        [],
        isZh ? '公平性散点' : 'Fairness scatter'
      ),
    [isZh, result]
  );
  const computationErrors = [alphaDataResult.error, seriesDataResult.error, weightDataResult.error].filter(
    (msg): msg is string => Boolean(msg)
  );
  const incentiveErrors = [rewardAvgDataResult.error, rhoSeriesDataResult.error, scatterDataResult.error].filter(
    (msg): msg is string => Boolean(msg)
  );

  const scatterData = scatterDataResult.data;
  const rankRows = result?.rank ?? [];
  const pearsonValue = result?.fairness.pearson_r;
  const pearsonInsight = useMemo(() => {
    if (pearsonValue === null || pearsonValue === undefined) {
      return isZh
        ? '需要至少两组有效的 X/Y 才能计算 Pearson ρ。'
        : 'At least two valid X/Y pairs are required to compute Pearson rho.';
    }
    const absVal = Math.abs(pearsonValue);
    if (absVal >= 0.7) return isZh ? '一致性较强：激励与性能高度对齐。' : 'Strong alignment: incentives and performance are closely matched.';
    if (absVal >= 0.4) return isZh ? '一致性中等：存在部分偏离，建议关注异常客户端。' : 'Moderate alignment: some deviations exist and outlier clients should be reviewed.';
    return isZh ? '一致性偏弱：激励与性能匹配度不足，需要复核分配策略。' : 'Weak alignment: incentives do not sufficiently match performance and the allocation strategy should be reviewed.';
  }, [isZh, pearsonValue]);

  const translateD3emWarning = (warning: string) => {
    if (!isZh) return warning;

    let match = warning.match(/^(.*) needs at least one series \(vind\/scos\/contrib\)\.$/);
    if (match) return `${match[1]} 至少需要一条序列（vind/scos/contrib）。`;

    match = warning.match(/^(.*): series length mismatch; trimmed to (\d+)\.$/);
    if (match) return `${match[1]}：序列长度不一致，已截断为 ${match[2]}。`;

    match = warning.match(/^(.*): V_ind\/S_cos missing; synthesized via synthetic_decompose\.$/);
    if (match) return `${match[1]}：缺少 V_ind/S_cos，已通过 synthetic_decompose 合成。`;

    match = warning.match(/^(.*): V_ind\/S_cos missing; using contrib as proxy \((.*)\)\.$/);
    if (match) return `${match[1]}：缺少 V_ind/S_cos，已使用 contribution 序列作为代理（${match[2]}）。`;

    match = warning.match(/^(.*): V_ind missing; derived from contrib \+ S_cos\.$/);
    if (match) return `${match[1]}：缺少 V_ind，已由 contribution 与 S_cos 反推。`;

    match = warning.match(/^(.*): V_ind missing; synthesized via synthetic_decompose\.$/);
    if (match) return `${match[1]}：缺少 V_ind，已通过 synthetic_decompose 合成。`;

    match = warning.match(/^(.*): V_ind missing; using contrib\/S_cos as proxy\.$/);
    if (match) return `${match[1]}：缺少 V_ind，已使用 contribution/S_cos 作为代理。`;

    match = warning.match(/^(.*): S_cos missing; derived from contrib \+ V_ind\.$/);
    if (match) return `${match[1]}：缺少 S_cos，已由 contribution 与 V_ind 反推。`;

    match = warning.match(/^(.*): S_cos missing; synthesized via synthetic_decompose\.$/);
    if (match) return `${match[1]}：缺少 S_cos，已通过 synthetic_decompose 合成。`;

    match = warning.match(/^(.*): S_cos missing; using contrib\/V_ind as proxy\.$/);
    if (match) return `${match[1]}：缺少 S_cos，已使用 contribution/V_ind 作为代理。`;

    match = warning.match(/^T=(\d+) exceeds available series length; trimmed to (\d+)\.$/);
    if (match) return `T=${match[1]} 超过可用序列长度，已截断为 ${match[2]}。`;

    match = warning.match(/^Normalization skipped at t=(\d+) due to near-zero sum\.$/);
    if (match) return `在 t=${match[1]} 时，由于总和接近 0，已跳过归一化。`;

    if (warning === 'Need at least two valid X/Y pairs to compute Pearson r.') {
      return '至少需要两组有效的 X/Y 才能计算 Pearson r。';
    }

    return warning;
  };

  const translatedWarnings = useMemo(
    () => (result?.warnings || []).map((warning) => translateD3emWarning(warning)),
    [isZh, result]
  );

  const clientMeta = useMemo(() => {
    const map: Record<string, { x: number | null; y: number | null }> = {};
    clientInputs.forEach((client) => {
      const id = client.name.trim() || client.id;
      const xVal = parseNumbers(client.independentAccuracy)[0];
      const yVal = parseNumbers(client.rewardedAccuracy)[0];
      map[id] = {
        x: Number.isFinite(xVal) ? xVal : null,
        y: Number.isFinite(yVal) ? yVal : null,
      };
    });
    return map;
  }, [clientInputs]);

  const lineColors = useMemo(
    () => [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.error.main,
    ],
    [theme]
  );

  const chartHeight = 320;
  const emptyChartMessage = isZh ? '请先加载示例数据或上传数据' : 'Load sample data or upload files first.';

  const renderEmptyChart = (height: number) => (
    <Box
      sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
        textAlign: 'center',
        px: 2,
      }}
    >
      <Typography variant="body2">{emptyChartMessage}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <HeroBanner
          gradientFrom={theme.palette.primary.dark || theme.palette.primary.main}
          gradientTo={theme.palette.primary.main}
          icon={<AssessmentIcon />}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InlineMath math={'D^3\\mathrm{EM}'} ariaLabel="D3EM" />
              <Typography component="span">{isZh ? '协作公平性评估' : 'Collaborative Fairness Evaluation'}</Typography>
            </Box>
          }
          subtitle={isZh ? '动态贡献评估与激励分配机制' : 'Dynamic contribution evaluation and incentive allocation'}
          description={
            <>
              {isZh
                ? '系统仅需隐私保留 summary（序列 + X/Y 标量），即可完成贡献评估、激励映射与公平性对齐展示。'
                : 'The system uses privacy-preserving summaries (series plus X/Y scalars) to evaluate contribution, map incentives, and visualize fairness alignment.'}
            </>
          }
          textColor="white"
        />
      </motion.div>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isZh
            ? '本模块用于回答：在联邦学习中，系统如何在不共享原始数据的前提下评估客户端贡献，并输出激励分配与公平性验证。'
            : 'This module addresses how client contribution can be evaluated, incentives assigned, and fairness validated without sharing raw data.'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isZh
            ? '与 Fed-e³ 的群体公平诊断、Fed4Fed 的性能一致性评估一起构成论文三部分技术贡献。'
            : 'Together with Fed-e3 and Fed4Fed, it forms the three-part technical contribution of the overall framework.'}
        </Typography>
      </Paper>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <AssessmentIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isZh ? '模块概览' : 'Module overview'}
            </Typography>
            <Chip label={isZh ? '机制路径' : 'Mechanism flow'} size="small" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isZh
              ? '系统展示 D³EM 如何解耦贡献信号并输出稳定的激励与公平性判断。'
              : 'This section shows how D3EM decouples contribution signals and produces stable incentive and fairness outputs.'}
          </Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {isZh ? '机制流程' : 'Mechanism flow'}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <FlowSteps
                    steps={mechanismSteps.map((step) => ({
                      label: (
                        <Tooltip title={step.help} arrow placement="top">
                          <span>{step.label}</span>
                        </Tooltip>
                      ),
                      sublabel: `(${step.symbol})`,
                    }))}
                    variant="check"
                    maxLabelWidth={{ xs: 66, sm: 82, md: 92 }}
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {isZh ? '展示重点' : 'Highlights'}
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    {isZh
                      ? '• alpha(t) 动态权重平衡独立与协作信号。'
                      : '• alpha(t) dynamically balances independent and collaborative signals.'}
                  </Typography>
                  <Typography variant="body2">
                    {isZh
                      ? '• EMA 平滑避免短期波动导致极端分配。'
                      : '• EMA smoothing prevents extreme allocations caused by short-term fluctuations.'}
                  </Typography>
                  <Typography variant="body2">
                    {isZh
                      ? '• 贡献分数直连激励份额与公平性解读。'
                      : '• Contribution scores directly connect to incentive shares and fairness interpretation.'}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">{isZh ? '机制细节（可选）' : 'Mechanism details (optional)'}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <Typography variant="body2">
                  {isZh
                    ? '• Noise coupling：分离独立价值与协作噪声。'
                    : '• Noise coupling: separates independent value from collaborative noise.'}
                </Typography>
                <Typography variant="body2">
                  {isZh
                    ? '• Spurious alignment：度量协作中的偏置对齐。'
                    : '• Spurious alignment: measures bias alignment within collaboration.'}
                </Typography>
                <Typography variant="body2">
                  {isZh ? '• 双层融合：' : '• Dual-layer fusion: '}
                  <InlineMath math={'C~ = \\\\alpha V_{ind} + (1-\\\\alpha) S_{cos}'} ariaLabel="C tilde" />.
                </Typography>
                <Typography variant="body2">
                  {isZh ? '• 动态权重：' : '• Dynamic weighting: '}
                  <InlineMath math={'\\\\alpha(t)'} ariaLabel="alpha" />
                  {isZh ? ' 随时间提升。' : ' increases over time.'}
                </Typography>
                <Typography variant="body2">
                  {isZh ? '• EMA 平滑：稳定 ' : '• EMA smoothing: stabilize '}
                  <InlineMath math={'C_k(t)'} ariaLabel="Ck" />
                  {isZh ? ' 的演化过程。' : ' evolution.'}
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <AutoGraphIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isZh ? '输入与配置' : 'Inputs and configuration'}
            </Typography>
            <Chip label={isZh ? '隐私保留摘要' : 'Privacy-preserving summary'} size="small" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isZh
              ? '上传隐私保留 summary：贡献序列 + X/Y 标量；可选 V_ind/S_cos 以展示完整 DEM 输入。'
              : 'Upload privacy-preserving summaries: contribution series plus X/Y scalars, with optional V_ind/S_cos for the full DEM input.'}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {isZh ? '参数与计算方式' : 'Parameters and computation'}
                </Typography>
                <Grid container spacing={1}>
                  {(
                    [
                      { key: 'beta', label: 'beta', step: 0.1 },
                      { key: 't0', label: 't0', step: 1 },
                      { key: 'gamma', label: 'gamma', step: 0.05 },
                      { key: 'a', label: 'a', step: 0.1 },
                      { key: 'd', label: 'd', step: 0.1 },
                    ] as const
                  ).map((item) => (
                    <Grid size={6} key={item.key}>
                      <TextField
                        label={item.label}
                        type="number"
                        size="small"
                        value={params[item.key]}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setParams((prev) => ({
                            ...prev,
                            [item.key]: Number.isFinite(val) ? val : prev[item.key],
                          }));
                        }}
                        fullWidth
                        inputProps={{ step: item.step }}
                      />
                    </Grid>
                  ))}
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={params.normalize}
                          onChange={(e) => setParams((prev) => ({ ...prev, normalize: e.target.checked }))}
                        />
                      }
                      label={isZh ? '逐轮归一化 C_k(t)（sum_k = 1）' : 'Normalize C_k(t) per round (sum_k = 1)'}
                    />
                  </Grid>
                  <Grid size={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="fallback-select">{isZh ? '缺失数据补全策略' : 'Missing-data fallback strategy'}</InputLabel>
                      <Select
                        labelId="fallback-select"
                        value={fallbackMode}
                        label={isZh ? '缺失数据补全策略' : 'Missing-data fallback strategy'}
                        onChange={(e) => setFallbackMode(e.target.value as D3emFallbackMode)}
                      >
                        <MenuItem value="synthetic_decompose">{isZh ? '合成分解' : 'Synthetic decomposition'}</MenuItem>
                        <MenuItem value="use_contrib_as_c_tilde">{isZh ? '用贡献序列作为 C~' : 'Use contribution series as C~'}</MenuItem>
                        <MenuItem value="use_contrib_as_scos">{isZh ? '用贡献序列作为 S_cos' : 'Use contribution series as S_cos'}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="caption" color="text.secondary">
                      {isZh
                        ? `推断 T：${inferredT || '—'}（来自上传序列）`
                        : `T inferred: ${inferredT || '—'} (from uploaded series)`}
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {isZh ? '计算设置' : 'Computation settings'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isZh
                    ? '当前实现默认在应用内完成计算流程，便于直接运行与复现。'
                    : 'The current implementation completes the computation flow directly in the app for easy execution and reproduction.'}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {isZh ? '运行评估' : 'Run evaluation'}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                  <Button startIcon={<UploadFileIcon />} variant="outlined" onClick={loadSampleData}>
                    {isZh ? '加载示例数据' : 'Load sample data'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={!isRunning && <PlayIcon />}
                    onClick={handleRun}
                    disabled={isRunning}
                    sx={{ minWidth: 220 }}
                  >
                    {isRunning ? (isZh ? '正在计算...' : 'Computing...') : isZh ? '开始 D³EM 评估' : 'Run D3EM evaluation'}
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {isZh
                    ? '系统仅使用 summary 输入；可只上传 contribution_series + X/Y。'
                    : 'The system works with summary inputs only; contribution_series plus X/Y is sufficient.'}
                </Typography>
                {summaryError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {summaryError}
                  </Alert>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isZh ? '客户端汇总输入' : 'Client summary inputs'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddClient} variant="outlined">
                {isZh ? '添加客户端' : 'Add client'}
              </Button>
              {clientInputs.length > 1 && (
                <Button
                  startIcon={<DeleteOutlineIcon />}
                  color="error"
                  onClick={() => handleRemoveClient(clientInputs[clientInputs.length - 1].id)}
                >
                  {isZh ? '移除最后一个' : 'Remove last'}
                </Button>
              )}
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isZh
              ? '说明：每个客户端只上传本地汇总后的序列与标量，避免暴露原始数据。'
              : 'Each client uploads only locally summarized series and scalars so that raw data is not exposed.'}
          </Typography>
          <Grid container spacing={2}>
            {clientInputs.map((client) => (
              <Grid size={{ xs: 12, md: 6 }} key={client.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <TextField
                        label={isZh ? '客户端 ID' : 'Client ID'}
                        value={client.name}
                        onChange={(e) => handleClientFieldChange(client.id, 'name', e.target.value)}
                        fullWidth
                        size="small"
                      />
                      {clientInputs.length > 1 && (
                        <IconButton onClick={() => handleRemoveClient(client.id)} color="error">
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    </Box>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                      fullWidth
                      sx={{ mb: 1 }}
                    >
                      {isZh ? '上传 contribution_series.txt' : 'Upload contribution_series.txt'}
                      <input
                        hidden
                        type="file"
                        accept=".txt"
                        onChange={handleSeriesUpload(client.id, 'contributionSeries', 'contributionFile')}
                      />
                    </Button>
                    <TextField
                      label={isZh ? '贡献序列（兼容输入）' : 'Contribution series (legacy)'}
                      value={client.contributionSeries.join(', ')}
                      onChange={(e) =>
                        handleClientFieldChange(client.id, 'contributionSeries', parseNumbers(e.target.value))
                      }
                      fullWidth
                      multiline
                      minRows={2}
                      placeholder="0.12, 0.10, 0.11"
                      sx={{ mb: 1 }}
                    />
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {isZh ? '可选高级序列' : 'Optional advanced series'}
                    </Typography>
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid size={12}>
                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<UploadFileIcon />}
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          {isZh ? '上传 V_ind_series.txt' : 'Upload V_ind_series.txt'}
                          <input
                            hidden
                            type="file"
                            accept=".txt"
                            onChange={handleSeriesUpload(client.id, 'vindSeries', 'vindFile')}
                          />
                        </Button>
                        <TextField
                          label={isZh ? 'V_ind 序列' : 'V_ind series'}
                          value={client.vindSeries.join(', ')}
                          onChange={(e) =>
                            handleClientFieldChange(client.id, 'vindSeries', parseNumbers(e.target.value))
                          }
                          fullWidth
                          multiline
                          minRows={2}
                          placeholder="0.10, 0.11, 0.12"
                          sx={{ mb: 1 }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<UploadFileIcon />}
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          {isZh ? '上传 S_cos_series.txt' : 'Upload S_cos_series.txt'}
                          <input
                            hidden
                            type="file"
                            accept=".txt"
                            onChange={handleSeriesUpload(client.id, 'scosSeries', 'scosFile')}
                          />
                        </Button>
                        <TextField
                          label={isZh ? 'S_cos 序列' : 'S_cos series'}
                          value={client.scosSeries.join(', ')}
                          onChange={(e) =>
                            handleClientFieldChange(client.id, 'scosSeries', parseNumbers(e.target.value))
                          }
                          fullWidth
                          multiline
                          minRows={2}
                          placeholder="0.08, 0.09, 0.10"
                          sx={{ mb: 1 }}
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label={isZh ? '独立性能 (X)' : 'Independent accuracy (X)'}
                          value={client.independentAccuracy}
                          onChange={(e) => handleClientFieldChange(client.id, 'independentAccuracy', e.target.value)}
                          fullWidth
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <Button component="label" size="small">
                                {isZh ? '上传' : 'Upload'}
                                <input
                                  hidden
                                  type="file"
                                  accept=".txt"
                                  onChange={handleScalarUpload(client.id, 'independentAccuracy', 'xFile')}
                                />
                              </Button>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label={isZh ? '奖励性能 (Y)' : 'Rewarded accuracy (Y)'}
                          value={client.rewardedAccuracy}
                          onChange={(e) => handleClientFieldChange(client.id, 'rewardedAccuracy', e.target.value)}
                          fullWidth
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <Button component="label" size="small">
                                {isZh ? '上传' : 'Upload'}
                                <input
                                  hidden
                                  type="file"
                                  accept=".txt"
                                  onChange={handleScalarUpload(client.id, 'rewardedAccuracy', 'yFile')}
                                />
                              </Button>
                            ),
                          }}
                        />
                      </Grid>
                    </Grid>
                    {client.error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {client.error}
                      </Alert>
                    )}
                    {client.contributionFile && (
                      <Typography variant="caption" color="text.secondary">
                        {isZh ? '已加载：' : 'Loaded: '}
                        {client.contributionFile}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <AutoGraphIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isZh ? 'DEM 计算过程' : 'DEM computation process'}
            </Typography>
            <Chip label={isZh ? '动态权重与融合' : 'Dynamic weighting and fusion'} size="small" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isZh
              ? '展示 alpha 动态权重、V_ind/S_cos 融合以及 EMA 平滑后的贡献演化。'
              : 'This section shows alpha weighting, V_ind/S_cos fusion, and the EMA-smoothed contribution evolution.'}
          </Typography>
          {isRunning && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
            </Box>
          )}
          {computationErrors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {computationErrors.join(' | ')}
            </Alert>
          )}
          {!result && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {isZh
                ? '请先加载示例数据或上传数据，再查看 DEM 计算过程的图表展示。'
                : 'Load sample data or upload inputs before viewing the DEM computation charts.'}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {isZh ? 'α(t) 动态权重' : 'Dynamic alpha schedule'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {isZh ? '副标题：Dynamic weighting schedule' : 'Subtitle: Dynamic weighting schedule'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: chartHeight }}>
                {alphaDataResult.data.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={alphaDataResult.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis domain={[0, 1]} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="alpha" stroke={theme.palette.primary.main} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  renderEmptyChart(chartHeight)
                )}
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {isZh
                  ? '说明：曲线展示系统对不同信号的信任权重如何随时间变化。'
                  : 'The curve shows how the trust weight assigned to different signals changes over time.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {isZh ? '单个客户端的贡献来源与融合结果' : 'Per-client contribution sources and fusion result'}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="client-select">{isZh ? '客户端' : 'Client'}</InputLabel>
                  <Select
                    labelId="client-select"
                    value={activeClientId || ''}
                    label={isZh ? '客户端' : 'Client'}
                    disabled={!clientIds.length}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    {clientIds.map((id) => (
                      <MenuItem key={id} value={id}>
                        {id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {isZh ? '副标题：V_ind / S_cos / C~ / EMA' : 'Subtitle: V_ind / S_cos / C~ / EMA'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: chartHeight }}>
                {seriesDataResult.data.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seriesDataResult.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="V_ind"
                        name={isZh ? '独立价值 V_ind' : 'Independent value V_ind'}
                        stroke={theme.palette.primary.main}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="S_cos"
                        name={isZh ? '耦合度 S_cos' : 'Coupling score S_cos'}
                        stroke={theme.palette.secondary.main}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="C_tilde"
                        name={isZh ? '融合贡献 C~' : 'Fused contribution C~'}
                        stroke={theme.palette.success.main}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="C_ema"
                        name={isZh ? '平滑贡献 EMA' : 'Smoothed contribution EMA'}
                        stroke={theme.palette.warning.main}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  renderEmptyChart(chartHeight)
                )}
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {isZh
                  ? '说明：对比不同贡献信号的趋势，观察融合后是否更平稳可信。'
                  : 'Compare different contribution signals to see whether the fused result is smoother and more reliable.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {isZh ? '客户端激励权重随时间变化（稳定性分析）' : 'Client incentive weights over time (stability analysis)'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {isZh ? '副标题：Normalized C_k(t)' : 'Subtitle: Normalized C_k(t)'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: chartHeight }}>
                {weightDataResult.data.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightDataResult.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      {clientIds.map((id, idx) => (
                        <Line
                          key={id}
                          type="monotone"
                          dataKey={id}
                          stroke={lineColors[idx % lineColors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  renderEmptyChart(chartHeight)
                )}
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {isZh
                  ? '说明：权重曲线越平稳，表示系统分配越稳定、避免极端波动。'
                  : 'Smoother weight curves indicate more stable allocation and fewer extreme fluctuations.'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <AssessmentIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isZh ? '激励分配与公平性结果' : 'Incentive allocation and fairness results'}
            </Typography>
            <Chip label={isZh ? '激励映射 + ρ' : 'Incentive mapping + ρ'} size="small" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isZh
              ? '贡献序列映射为激励份额，并给出 Pearson ρ 的公平性对齐结果。'
              : 'Contribution series are mapped to incentive shares, together with the Pearson ρ fairness alignment result.'}
          </Typography>
          {!result && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {isZh ? '运行评估后将在此显示结果。' : 'Results will appear here after you run the evaluation.'}
            </Alert>
          )}
          {result?.warnings?.length ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {translatedWarnings.join(' | ')}
            </Alert>
          ) : null}
          {incentiveErrors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {incentiveErrors.join(' | ')}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {isZh ? '激励分配概览（平均权重）' : 'Incentive allocation overview (average weights)'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {isZh ? '副标题：rho_avg / c_avg' : 'Subtitle: rho_avg / c_avg'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: chartHeight }}>
                {rewardAvgDataResult.data.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rewardAvgDataResult.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="clientId" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="rho_avg" fill={theme.palette.primary.main} name={isZh ? '平均激励 ρ_avg' : 'Average incentive ρ_avg'} />
                      <Bar dataKey="c_avg" fill={theme.palette.success.main} name={isZh ? '平均贡献 c_avg' : 'Average contribution c_avg'} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  renderEmptyChart(chartHeight)
                )}
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {isZh
                  ? '说明：展示各客户端的平均激励份额与贡献权重对齐程度。'
                  : 'This chart shows each client’s average incentive share and its alignment with contribution weights.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {isZh ? '单客户端激励随时间变化' : 'Single-client incentive over time'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {isZh ? '副标题：rho_k(t)' : 'Subtitle: rho_k(t)'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: chartHeight }}>
                {rhoSeriesDataResult.data.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rhoSeriesDataResult.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="rho" stroke={theme.palette.secondary.main} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  renderEmptyChart(chartHeight)
                )}
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {isZh
                  ? '说明：观察单客户端激励随时间是否稳定，避免短期波动影响长期激励。'
                  : 'This view shows whether a single client’s incentive remains stable over time instead of being dominated by short-term fluctuations.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {isZh ? '激励分配与性能一致性（公平性验证）' : 'Incentive-performance consistency (fairness validation)'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {isZh ? '副标题：Pearson ρ' : 'Subtitle: Pearson ρ'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: chartHeight }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {pearsonValue !== null && pearsonValue !== undefined ? pearsonValue.toFixed(3) : 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {pearsonInsight}
                </Typography>
                <Box sx={{ height: 200 }}>
                  {scatterData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x" name={isZh ? '独立性能 X' : 'Independent performance X'} domain={['auto', 'auto']} />
                        <YAxis type="number" dataKey="y" name={isZh ? '奖励性能 Y' : 'Rewarded performance Y'} domain={['auto', 'auto']} />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={scatterData} fill={theme.palette.primary.main} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    renderEmptyChart(200)
                  )}
                </Box>
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {isZh
                  ? '说明：点越接近对角线，表示激励越符合实际性能表现。'
                  : 'Points closer to the diagonal indicate that incentives better match the observed performance.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {isZh ? '贡献排名与对齐概览' : 'Contribution ranking and alignment overview'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                {rankRows.length ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableRow>
                          <TableCell>{isZh ? '客户端' : 'Client'}</TableCell>
                          <TableCell align="right">c_avg</TableCell>
                          <TableCell align="right">rho_avg</TableCell>
                          <TableCell align="right">X</TableCell>
                          <TableCell align="right">Y</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rankRows.map((entry) => (
                          <TableRow key={entry.clientId}>
                            <TableCell>{entry.clientId}</TableCell>
                            <TableCell align="right">{entry.c_avg.toFixed(4)}</TableCell>
                            <TableCell align="right">{entry.rho_avg.toFixed(4)}</TableCell>
                            <TableCell align="right">
                              {clientMeta[entry.clientId]?.x !== null && clientMeta[entry.clientId]?.x !== undefined
                                ? clientMeta[entry.clientId].x!.toFixed(3)
                                : '—'}
                            </TableCell>
                            <TableCell align="right">
                              {clientMeta[entry.clientId]?.y !== null && clientMeta[entry.clientId]?.y !== undefined
                                ? clientMeta[entry.clientId].y!.toFixed(3)
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  renderEmptyChart(chartHeight)
                )}
              </Paper>
              <Typography variant="caption" color="text.secondary">
                {isZh
                  ? '说明：综合展示客户端贡献排序及其与性能指标的对应关系。'
                  : 'This table summarizes client contribution ranking and its correspondence with performance metrics.'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CollaborativeFairness;
