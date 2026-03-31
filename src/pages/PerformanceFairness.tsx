import React, { useState } from 'react';
import {
  Typography,
  Container,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Paper,
  Chip,
  useTheme,
  LinearProgress,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  PlayArrow as PlayIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { motion } from 'framer-motion';
import { InlineMath } from '../components/MathText';
import performanceScenarios, { PerformanceScenario } from '../data/performance-fairness';
import { runFed4Fed, Fed4FedResponse } from '../api/fed4fed';
import FederatedUploadSection from '../components/FederatedUpload/FederatedUploadSection';
import { useFederatedUpload } from '../components/FederatedUpload/useFederatedUpload';
import HeroBanner from '../components/HeroBanner';
import { useLanguage } from '../i18n/language';

const PerformanceFairness: React.FC = () => {
  const theme = useTheme();
  const { isZh } = useLanguage();
  const [selectedScenario, setSelectedScenario] = useState<string>('custom');
  const [evaluationResult, setEvaluationResult] = useState<PerformanceScenario | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const upload = useFederatedUpload({
    defaultAlpha: 0.05,
    resultReady: selectedScenario === 'custom' && !!evaluationResult,
    onDataChange: () => {
      if (selectedScenario === 'custom') {
        setEvaluationResult(null);
      }
    },
    onRunSummary: async (payload) => {
      const resp = await runFed4Fed(payload);
      const scenarioFromApi = mapApiToScenario(resp);
      setEvaluationResult(scenarioFromApi);
      setSelectedScenario('custom');
    },
    onRunRaw: async (datasets) => {
      const resp = await runFed4Fed({ datasets });
      const scenarioFromApi = mapApiToScenario(resp);
      setEvaluationResult(scenarioFromApi);
      setSelectedScenario('custom');
    },
  });
  const placeholderScenario: PerformanceScenario = {
    name: isZh ? '自定义（上传摘要）' : 'Custom (use uploads)',
    description: isZh
      ? '上传客户端 bootstrap 性能指标以运行 Fed4Fed。'
      : 'Upload client bootstrap performance metrics to run Fed4Fed.',
    averageAccuracy: 0,
    accuracyVariance: 0,
    pValue: 0,
    clients: [],
    confidenceInterval: {
      lower: 0,
      upper: 0,
      mean: 0,
      confidence: 0,
    },
    fed4fedAnalysis: {
      globalModelFairness: false,
      statisticalSignificance: 0,
      effectSize: 0,
      performanceVariability: 0,
      fairnessThreshold: 0.05,
    },
    deploymentReadiness: false,
    fairnessAssessment: isZh
      ? '请先上传下方摘要文件，然后运行评估。'
      : 'Upload summary files below and then run the evaluation.',
  };

  const scenario: PerformanceScenario =
    selectedScenario === 'custom' && evaluationResult
      ? evaluationResult
      : performanceScenarios[selectedScenario] || placeholderScenario;
  const busy = isLoading || upload.isRunning;

  const translateScenarioName = (key: string, name: string) => {
    if (!isZh) return name;
    if (key === 'unfair') return '场景 1：模型 1';
    if (key === 'fair') return '场景 2：模型 2';
    if (key === 'moderate') return '场景 3：模型 3';
    return name;
  };

  const translateFairnessAssessment = (key: string, text: string) => {
    if (!isZh) return text;
    if (key === 'unfair') {
      return '性能不公平：检测到客户端之间存在显著性能差异，不建议部署。';
    }
    if (key === 'fair') {
      return '性能公平：客户端之间性能表现一致，满足部署要求。';
    }
    if (key === 'moderate') {
      return '性能不公平：检测到具有统计显著性的性能差异，仍需进一步优化。';
    }
    return text;
  };

  const handleScenarioChange = (event: any) => {
    setSelectedScenario(event.target.value as string);
    setEvaluationResult(null);
  };

  const loadSampleData = () => {
    upload.loadSampleClients([
      {
        name: 'Client 1',
        values: [0.920, 0.918, 0.921, 0.915, 0.923],
        fileName: 'bootstrap_metrics.txt',
      },
      {
        name: 'Client 2',
        values: [0.885, 0.882, 0.879, 0.887, 0.881],
        fileName: 'bootstrap_metrics.txt',
      },
      {
        name: 'Client 3',
        values: [0.820, 0.825, 0.818, 0.830, 0.815],
        fileName: 'bootstrap_metrics.txt',
      },
    ]);
    setSelectedScenario('custom');
    setEvaluationResult(null);
  };

  const mapApiToScenario = (resp: Fed4FedResponse): PerformanceScenario => {
    const clients = resp.clients.map((client) => ({
      id: client.id,
      accuracy: client.mean, // use mean as point accuracy for plotting
      mean: client.mean,
      std: client.std,
      confidence: 0.95,
    }));

    const averageAccuracy =
      clients.reduce((sum, c) => sum + c.mean, 0) / (clients.length || 1);
    const accuracyVariance =
      clients.reduce((sum, c) => sum + Math.pow(c.mean - averageAccuracy, 2), 0) /
      (clients.length || 1);

    return {
      name: isZh ? '自定义评估' : 'Custom Evaluation',
      description: isZh
        ? '基于上传 bootstrap 结果的 Fed4Fed 评估'
        : 'Fed4Fed evaluation from uploaded client bootstrap results',
      averageAccuracy,
      accuracyVariance,
      pValue: resp.pValue,
      clients,
      confidenceInterval:
        resp.confidenceInterval || {
          lower: averageAccuracy,
          upper: averageAccuracy,
          mean: averageAccuracy,
          confidence: 0.0,
        },
      fed4fedAnalysis: resp.fed4fedAnalysis,
      deploymentReadiness: resp.deploymentReadiness,
      fairnessAssessment: resp.fairnessAssessment,
    };
  };

  const handleRunEvaluation = async () => {
    // For consistency, built-in scenarios still show static data quickly
    if (selectedScenario !== 'custom') {
      setIsLoading(true);
      setTimeout(() => {
        setEvaluationResult(performanceScenarios[selectedScenario]);
        setIsLoading(false);
      }, 500);
      return;
    }

    await upload.runSummary();
  };

  const consistencyLabel = (flag: boolean) => {
    if (isZh) return flag ? '一致' : '偏差';
    return flag ? 'Consistent' : 'Mismatch';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <HeroBanner
          gradientFrom={theme.palette.secondary.main}
          gradientTo={theme.palette.secondary.light}
          icon={<AnalyticsIcon />}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InlineMath math={'\\mathrm{Fed4Fed}'} ariaLabel="Fed4Fed" />
              <Typography component="span">{isZh ? '性能公平性评估' : 'Performance Fairness Evaluation'}</Typography>
            </Box>
          }
          subtitle={isZh ? '跨客户端性能一致性统计评估' : 'Statistical evaluation of cross-client performance consistency'}
          description={
            <>
              {isZh
                ? '系统基于统计检验评估不同客户端的性能分布一致性，并给出置信区间与部署可靠性判断。'
                : 'The system evaluates cross-client consistency through statistical testing and reports confidence intervals and deployment readiness.'}
            </>
          }
          textColor="white"
        />
      </motion.div>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isZh
            ? '本模块用于回答：不同客户端的性能评估是否可比较、是否存在系统性偏差。'
            : 'This module addresses whether client performance evaluations are comparable and whether systematic deviations exist.'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isZh
            ? '系统以统计检验与置信区间给出一致性结论，并与 Fed-e³、D³EM 共同构成论文评估体系。'
            : 'It provides consistency conclusions through statistical testing and confidence intervals, together with Fed-e3 and D3EM in the overall evaluation framework.'}
        </Typography>
      </Paper>
      <Grid container spacing={3}>
        <Grid size={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <ScienceIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {isZh
                      ? <>统计一致性评估框架（<InlineMath math={'\\mathrm{Fed4Fed}'} />）</>
                      : <>Statistical Consistency Framework (<InlineMath math={'\\mathrm{Fed4Fed}'} />)</>}
                  </Typography>
                  <Chip 
                    label={isZh ? (scenario.deploymentReadiness ? '可部署' : '需优化') : (scenario.deploymentReadiness ? 'Deployable' : 'Needs tuning')}
                    color={scenario.deploymentReadiness ? 'success' : 'warning'}
                    sx={{ ml: 2, fontWeight: 600 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {isZh
                    ? '该框架用于判断客户端性能分布是否一致，并给出可部署性判断。'
                    : 'This framework determines whether client performance distributions are consistent and whether the result is ready for deployment.'}
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel id="scenario-select-label">{isZh ? '评估场景' : 'Scenario'}</InputLabel>
                      <Select
                        labelId="scenario-select-label"
                        value={selectedScenario}
                        label={isZh ? '评估场景' : 'Scenario'}
                        onChange={handleScenarioChange}
                      >
                        {Object.entries(performanceScenarios).map(([key, scenario]) => (
                          <MenuItem key={key} value={key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <Typography sx={{ flexGrow: 1 }}>
                                {translateScenarioName(key, scenario.name)}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={consistencyLabel(scenario.fed4fedAnalysis.globalModelFairness)}
                                color={scenario.fed4fedAnalysis.globalModelFairness ? 'success' : 'error'}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          </MenuItem>
                        ))}
                        {evaluationResult && (
                          <MenuItem value="custom">
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <Typography sx={{ flexGrow: 1 }}>{isZh ? '自定义（上传摘要）' : 'Custom (summary upload)'}</Typography>
                              <Chip 
                                size="small" 
                                label={consistencyLabel(evaluationResult.fed4fedAnalysis.globalModelFairness)}
                                color={evaluationResult.fed4fedAnalysis.globalModelFairness ? 'success' : 'error'}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          </MenuItem>
                        )}
                      </Select>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {isZh
                          ? '选择内置示例或 Custom（使用下方上传的客户端汇总统计量）'
                          : 'Choose a built-in example or Custom (using the uploaded client summary statistics below).'}
                      </Typography>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button variant="outlined" onClick={loadSampleData}>
                        {isZh ? '加载示例数据' : 'Load sample data'}
                      </Button>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleRunEvaluation}
                        disabled={busy}
                        startIcon={!busy && <PlayIcon />}
                        sx={{ 
                          minWidth: 200,
                          height: 56,
                          background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.secondary.light} 90%)`,
                        }}
                      >
                        {busy
                          ? isZh ? '正在评估...' : 'Evaluating...'
                          : isZh ? '开始性能一致性评估' : 'Run performance consistency evaluation'}
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {selectedScenario === 'custom'
                          ? isZh
                            ? '将使用下方上传的本地汇总统计量（不会上传原始 bootstrap）'
                            : 'The evaluation will use the uploaded local summary statistics (raw bootstrap arrays are not uploaded).'
                          : isZh
                            ? '直接加载内置示例数据'
                            : 'Use the built-in sample data directly'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {isZh ? '一致性结论（系统判断）' : 'Consistency conclusion'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {translateFairnessAssessment(selectedScenario, scenario.fairnessAssessment)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {scenario.fed4fedAnalysis.globalModelFairness ? (
                          <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
                        ) : (
                          <CancelIcon color="error" sx={{ fontSize: 32 }} />
                        )}
                        <Box>
                          <Typography variant="body2" color="text.secondary">{isZh ? 'P 值' : 'P-value'}</Typography>
                          <Typography variant="h6">{scenario.pValue.toFixed(3)}</Typography>
                        </Box>
                        <Chip
                          label={consistencyLabel(scenario.fed4fedAnalysis.globalModelFairness)}
                          color={scenario.fed4fedAnalysis.globalModelFairness ? 'success' : 'error'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {isZh
                          ? '说明：P 值与一致性标签用于判断不同客户端评估是否可比较。'
                          : 'P-values and consistency labels indicate whether evaluations across clients are comparable.'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {busy && (
                  <Box sx={{ mt: 3 }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                      {isZh
                        ? '正在分析客户端性能分布并计算统计一致性指标...'
                        : 'Analyzing client performance distributions and computing consistency statistics...'}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid size={12}>
          <FederatedUploadSection
            title={isZh ? '上传客户端性能摘要' : 'Upload client performance summaries'}
            description={
              isZh
                ? '每个客户端仅上传本地 txt 文件，系统先提取/统计 bootstrap 性能指标（均值、标准差、分位数置信区间），再生成统一的性能一致性评估结果。'
                : 'Each client uploads a local txt file. The system extracts bootstrap performance metrics (mean, standard deviation, and percentile intervals) and then generates a unified consistency assessment.'
            }
            upload={upload}
            summaryRunLabel={isZh ? '使用汇总统计运行 Fed4Fed' : 'Run Fed4Fed with summary statistics'}
            summaryRunningLabel={isZh ? '正在汇总 Fed4Fed...' : 'Running Fed4Fed...'}
            debugTitle={isZh ? '高级模式 / 调试' : 'Advanced / Debug'}
            debugRunLabel={isZh ? '直接运行（原始数组）' : 'Run directly (raw arrays)'}
            debugRunningLabel={isZh ? '运行中...' : 'Running...'}
          />
        </Grid>

        {evaluationResult && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {isZh ? '客户端性能分布对比' : 'Client performance distribution comparison'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  {isZh ? '副标题：Bootstrap performance distributions' : 'Subtitle: Bootstrap performance distributions'}
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      data={(() => {
                        // Generate shared x-axis data points for all curves
                        const numPoints = 200;
                        const globalMin = Math.min(...evaluationResult.clients.map(c => c.mean - 4 * c.std));
                        const globalMax = Math.max(...evaluationResult.clients.map(c => c.mean + 4 * c.std));
                        const range = globalMax - globalMin || 1e-6;
                        const step = range / numPoints;
                        
                        const sharedData = [];
                        for (let i = 0; i <= numPoints; i++) {
                          const x = globalMin + i * step;
                          const point: any = { accuracy: x };
                          
                          // Calculate density for each client at this x value
                          evaluationResult.clients.forEach((client, index) => {
                            const denom = client.std > 0 ? client.std : 1e-8;
                            const normalizedX = (x - client.mean) / denom;
                            const density = Math.exp(-0.5 * normalizedX * normalizedX) / (denom * Math.sqrt(2 * Math.PI));
                            point[client.id] = density;
                          });
                          
                          sharedData.push(point);
                        }
                        return sharedData;
                      })()}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="accuracy"
                        domain={['dataMin', 'dataMax']}
                        type="number"
                        label={{ value: isZh ? '准确率' : 'Accuracy', position: 'insideBottom', offset: -10 }}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <YAxis 
                        label={{ value: isZh ? '概率密度' : 'Density', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [(value as number).toFixed(4), isZh ? `${name} 密度` : `${name} density`]}
                        labelFormatter={(label) =>
                          isZh ? `准确率: ${(label as number).toFixed(3)}` : `Accuracy: ${(label as number).toFixed(3)}`
                        }
                      />
                      <Legend />
                      {evaluationResult.clients.map((client, index) => {
                        const colors = [
                          '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#e74c3c',
                          '#9b59b6', '#1abc9c', '#f39c12', '#3498db', '#2ecc71'
                        ];
                        
                        return (
                          <Line
                            key={client.id}
                            type="monotone"
                            dataKey={client.id}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2.5}
                            dot={false}
                            connectNulls={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {isZh
                    ? '说明：曲线越重叠，表示不同客户端的性能评估越一致、可比较性越高。'
                    : 'More overlap between curves indicates stronger consistency and higher comparability across clients.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default PerformanceFairness;
