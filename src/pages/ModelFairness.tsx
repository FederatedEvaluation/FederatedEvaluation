import React, { useState, useMemo } from 'react';
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
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  Category as CategoryIcon,
  Assessment as AssessmentIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { InlineMath } from '../components/MathText';
import modelFairnessScenarios, { ModelFairnessScenario } from '../data/model-fairness';
import { runFede3, Fede3Response } from '../api/fede3';
import FederatedUploadSection from '../components/FederatedUpload/FederatedUploadSection';
import { useFederatedUpload } from '../components/FederatedUpload/useFederatedUpload';
import HeroBanner from '../components/HeroBanner';
import { useLanguage } from '../i18n/language';

const ModelFairness: React.FC = () => {
  const theme = useTheme();
  const { isZh } = useLanguage();
  const [selectedScenario, setSelectedScenario] = useState<string>('fair');
  const [evaluationResult, setEvaluationResult] = useState<ModelFairnessScenario | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const upload = useFederatedUpload({
    defaultAlpha: 0.05,
    resultReady: selectedScenario === 'custom' && !!evaluationResult,
    onDataChange: () => {
      if (selectedScenario === 'custom') {
        setEvaluationResult(null);
      }
    },
    onRunSummary: async (payload) => {
      const resp = await runFede3(payload);
      const scenarioFromApi = mapApiToScenario(resp);
      setEvaluationResult(scenarioFromApi);
      setSelectedScenario('custom');
      setExpandedPanel(false);
    },
    onRunRaw: async (datasets) => {
      const resp = await runFede3({ datasets });
      const scenarioFromApi = mapApiToScenario(resp);
      setEvaluationResult(scenarioFromApi);
      setSelectedScenario('custom');
      setExpandedPanel(false);
    },
  });
  const scenario: ModelFairnessScenario =
    selectedScenario === 'custom' && evaluationResult
      ? evaluationResult
      : modelFairnessScenarios[selectedScenario] || {
          name: isZh ? '自定义（上传摘要）' : 'Custom (use uploads)',
          description: isZh
            ? '上传客户端公平性指标以运行 Fed-e3。'
            : 'Upload client fairness metrics to run Fed-e3.',
          groupA: { tp: 0, fp: 0, tn: 0, fn: 0 },
          groupB: { tp: 0, fp: 0, tn: 0, fn: 0 },
          fedE3Analysis: {
            twoStageTest: {
              stage1_pValue: 0,
              stage2_pValue: 0,
              stage1_testStatistic: 0,
              stage2_testStatistic: 0,
              stage1_description: '',
              stage2_description: '',
              stage1_passed: false,
              stage2_passed: false,
            },
            biasClassification: { biasType: 'fair', classificationReason: '', confidenceLevel: 0 },
            clientResults: [],
            overallFairness: false,
            deploymentRecommendation: isZh
              ? '请先上传下方摘要文件，然后运行评估。'
              : 'Upload summary files below and then run the evaluation.',
            riskLevel: 'Low',
          },
          overallAssessment: isZh
            ? '请先上传下方摘要文件，然后运行评估。'
            : 'Upload summary files below and then run the evaluation.',
        };
  const biasTypeLabels: Record<string, string> = {
    fair: isZh ? '公平' : 'Fair',
    systemic: isZh ? '系统性偏置' : 'Systemic bias',
    heterogeneous: isZh ? '异质性偏置' : 'Heterogeneous bias',
  };
  const biasTypeLabel =
    biasTypeLabels[scenario.fedE3Analysis.biasClassification.biasType] ||
    scenario.fedE3Analysis.biasClassification.biasType;

  const translateScenarioName = (key: string, name: string) => {
    if (!isZh) return name;
    if (key === 'fair') return '公平模型';
    if (key === 'systemic') return '系统性偏置模型';
    if (key === 'heterogeneous') return '异质性偏置模型';
    return name;
  };

  const translateStageDesc = (text: string) => {
    if (!text) return text;
    if (isZh) {
      if (text === 'Homogeneity across clients') return '客户端一致性检验';
      if (text === 'Bias equals zero') return '偏置为零';
      if (text === 'Not applicable') return '不适用';
      if (text === 'Testing for consistency of fairness performance across clients') {
        return '检验不同客户端之间的公平性表现是否一致';
      }
      if (text === 'Testing for overall fairness (given consistency)') {
        return '在通过一致性检验后，进一步检验整体是否公平';
      }
      if (text === 'Not applicable - stage 1 failed') {
        return '不适用，原因是第一阶段未通过';
      }
    }
    return text;
  };

  const translateOverallAssessment = (text: string) => {
    if (!isZh) return text;
    if (text === 'Model passes Fed-e³ evaluation: consistent and fair across all clients') {
      return '模型通过 Fed-e³ 评估：各客户端之间表现一致，整体公平。';
    }
    if (text === 'Model exhibits systematic bias: consistent unfairness across all clients') {
      return '模型表现出系统性偏置：各客户端之间不公平表现一致。';
    }
    if (text === 'Model exhibits heterogeneous bias: different fairness patterns across clients') {
      return '模型表现出异质性偏置：不同客户端之间的公平性模式不一致。';
    }
    return text;
  };

  const translateClassificationReason = (text: string) => {
    if (!isZh) return text;
    if (text === 'Both stage 1 (p=0.68) and stage 2 (p=0.43) p-values > 0.05') {
      return '第一阶段（p=0.68）和第二阶段（p=0.43）的 p 值均大于 0.05。';
    }
    if (text === 'Stage 1 passed (p=0.72) but stage 2 failed (p=0.008): systematic bias across all clients') {
      return '第一阶段通过（p=0.72），但第二阶段未通过（p=0.008），说明所有客户端存在系统性偏置。';
    }
    if (text === 'Stage 1 failed (p=0.02): inconsistent fairness behavior across clients') {
      return '第一阶段未通过（p=0.02），说明不同客户端之间存在不一致的公平性表现。';
    }
    return text;
  };

  const translateInterpretation = (text: string) => {
    if (!isZh) return text;
    if (text === 'Systemic bias confidence interval') {
      return '系统性偏置的置信区间估计。';
    }
    if (text === 'Significant demographic parity violation with 95% confidence interval [0.18, 0.32]') {
      return '人口统计均衡存在显著偏差，95% 置信区间为 [0.18, 0.32]。';
    }
    if (text === 'Significant equalized odds violation with 95% confidence interval [0.15, 0.29]') {
      return '机会均等存在显著偏差，95% 置信区间为 [0.15, 0.29]。';
    }
    if (text === 'Moderate demographic parity violation with high variance across clients [0.08, 0.22]') {
      return '人口统计均衡存在中等程度偏差，且不同客户端之间方差较高，区间为 [0.08, 0.22]。';
    }
    if (text === 'Moderate equalized odds violation with high variance across clients [0.11, 0.25]') {
      return '机会均等存在中等程度偏差，且不同客户端之间方差较高，区间为 [0.11, 0.25]。';
    }
    return text;
  };

  const translateRecommendation = (text: string) => {
    if (!isZh) return text;
    if (text === 'Safe for deployment - model demonstrates consistent fairness across all clients') {
      return '可以部署，模型在所有客户端上都表现出一致的公平性。';
    }
    if (text === 'Not recommended for deployment - systematic bias detected across all clients') {
      return '不建议部署，系统在所有客户端上都检测到了系统性偏置。';
    }
    if (text === 'Requires client-specific bias mitigation before deployment') {
      return '部署前需要进行面向客户端的偏置缓解。';
    }
    return text;
  };

  const translateRiskLevel = (riskLevel: string) => {
    if (!isZh) return riskLevel;
    if (riskLevel === 'Low') return '低';
    if (riskLevel === 'Medium') return '中';
    if (riskLevel === 'High') return '高';
    return riskLevel;
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleScenarioChange = (event: any) => {
    setSelectedScenario(event.target.value as string);
    setEvaluationResult(null);
  };

  const mapApiToScenario = (resp: Fede3Response): ModelFairnessScenario => {
    const biasType = resp.biasClassification.biasType;
    const overallFairness = resp.overallFairness;
    const clientResults = resp.clients.map((c) => ({
      clientId: c.clientId,
      demographicParity: c.demographicParity,
      equalOpportunity: c.equalOpportunity,
      isConsistent: c.isConsistent ?? resp.twoStageTest.stage1_passed,
      groupAConfusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
      groupBConfusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
    }));

    const scenarioFromApi: ModelFairnessScenario = {
      name: isZh ? '自定义 Fed-e3 评估' : 'Custom Fed-e3 Evaluation',
      description: isZh
        ? '基于上传 bootstrap 公平性指标的 Fed-e3 评估'
        : 'Fed-e3 evaluation from uploaded bootstrap fairness metrics',
      groupA: { tp: 0, fp: 0, tn: 0, fn: 0 },
      groupB: { tp: 0, fp: 0, tn: 0, fn: 0 },
      fedE3Analysis: {
        twoStageTest: {
          stage1_pValue: resp.twoStageTest.stage1_pValue,
          stage2_pValue: resp.twoStageTest.stage2_pValue,
          stage1_testStatistic: resp.twoStageTest.stage1_testStatistic,
          stage2_testStatistic: resp.twoStageTest.stage2_testStatistic,
          stage1_description: 'Homogeneity across clients',
          stage2_description: resp.twoStageTest.stage1_passed ? 'Bias equals zero' : 'Not applicable',
          stage1_passed: resp.twoStageTest.stage1_passed,
          stage2_passed: resp.twoStageTest.stage2_passed,
        },
        biasClassification: {
          biasType,
          classificationReason: resp.biasClassification.classificationReason,
          confidenceLevel: resp.biasClassification.confidenceLevel,
        },
        dpQuantification:
          biasType === 'systemic' && resp.systemicCI
            ? {
                metric: 'DP',
                pointEstimate: resp.systemicCI.pointEstimate,
                confidenceInterval: {
                  lower: resp.systemicCI.lower,
                  upper: resp.systemicCI.upper,
                  confidence: 0.95,
                },
                interpretation: 'Systemic bias confidence interval',
              }
            : undefined,
        eoQuantification: undefined,
        clientResults,
        overallFairness,
        deploymentRecommendation: resp.deploymentRecommendation,
        riskLevel: resp.riskLevel,
      },
      overallAssessment: resp.deploymentRecommendation,
    };
    return scenarioFromApi;
  };

  const handleRunEvaluation = async () => {
    if (selectedScenario !== 'custom') {
      setEvaluationResult(modelFairnessScenarios[selectedScenario]);
      return;
    }
    await upload.runSummary();
  };

  const loadSampleData = () => {
    upload.loadSampleClients([
      {
        name: 'Client 1',
        values: [0.005, -0.002, 0.003, 0.001, -0.001, 0.004],
        fileName: 'bootstrap_metrics.txt',
      },
      {
        name: 'Client 2',
        values: [0.02, 0.018, 0.015, 0.022, 0.017],
        fileName: 'bootstrap_metrics.txt',
      },
      {
        name: 'Client 3',
        values: [0.06, 0.055, 0.07, 0.065, 0.058, 0.062],
        fileName: 'bootstrap_metrics.txt',
      },
    ]);
    setSelectedScenario('custom');
    setEvaluationResult(null);
    setExpandedPanel(false);
  };

  // Visualization data for charts
  const biasTypeDistribution = useMemo(() => {
    if (!evaluationResult) return [];
    const biasType = evaluationResult.fedE3Analysis.biasClassification.biasType;
    return [
      { name: isZh ? '公平' : 'Fair', value: biasType === 'fair' ? 100 : 0, color: '#00C49F' },
      { name: isZh ? '系统性偏置' : 'Systemic bias', value: biasType === 'systemic' ? 100 : 0, color: '#FF8042' },
      { name: isZh ? '异质性偏置' : 'Heterogeneous bias', value: biasType === 'heterogeneous' ? 100 : 0, color: '#FFBB28' }
    ].filter(item => item.value > 0);
  }, [evaluationResult, isZh]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <HeroBanner
          gradientFrom={theme.palette.error.main}
          gradientTo={theme.palette.error.light}
          icon={<SecurityIcon />}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} ariaLabel="Fed-e3" />
              <Typography component="span">{isZh ? '群体公平性评估' : 'Group Fairness Evaluation'}</Typography>
            </Box>
          }
          subtitle={isZh ? '检测 → 分类 → 量化' : 'Detection → Classification → Quantification'}
          description={
            <>
              {isZh
                ? '系统通过三层级流程识别群体偏置：先检测整体与局部偏差，再分类偏置类型，最后量化偏置强度并给出部署建议。'
                : 'The system identifies group bias through a three-level process: detection, classification, and quantification, followed by deployment guidance.'}
            </>
          }
          textColor="white"
        />
      </motion.div>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isZh
            ? '本模块用于回答：在联邦环境下，系统如何逐层识别并量化群体不公平性。'
            : 'This module addresses how unfairness across groups can be identified and quantified step by step in federated settings.'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isZh
            ? '与 Fed4Fed 的性能一致性评估、D³EM 的协作公平性评估共同构成论文的公平性评价链路。'
            : 'Together with Fed4Fed and D3EM, it forms the fairness evaluation pipeline of the overall framework.'}
        </Typography>
      </Paper>

      <Grid container spacing={4}>
        {/* Fed-e³ Algorithm Steps */}
        <Grid size={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <AssessmentIcon sx={{ mr: 1, color: theme.palette.error.main }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {isZh
                      ? <>三层级公平性诊断流程（<InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} />）</>
                      : <>Three-stage fairness diagnosis (<InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} />)</>}
                  </Typography>
                  <Chip 
                    label={scenario.fedE3Analysis.overallFairness ? (isZh ? '公平' : 'Fair') : biasTypeLabel}
                    color={scenario.fedE3Analysis.overallFairness ? 'success' : 'error'}
                    sx={{ ml: 2, fontWeight: 600 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {isZh
                    ? '系统通过检测 → 分类 → 量化的三级流程，给出群体公平性与风险结论。'
                    : 'The system produces group fairness conclusions and risk signals through a three-stage process of detection, classification, and quantification.'}
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
                        {Object.entries(modelFairnessScenarios).map(([key, scenario]) => (
                          <MenuItem key={key} value={key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <Typography sx={{ flexGrow: 1 }}>
                                {translateScenarioName(key, scenario.name)}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={scenario.fedE3Analysis.overallFairness ? (isZh ? '公平' : 'Fair') : (isZh ? '偏置' : 'Bias')}
                                color={scenario.fedE3Analysis.overallFairness ? 'success' : 'error'}
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
                                label={evaluationResult.fedE3Analysis.overallFairness ? (isZh ? '公平' : 'Fair') : (isZh ? '偏置' : 'Bias')}
                                color={evaluationResult.fedE3Analysis.overallFairness ? 'success' : 'error'}
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
                        disabled={upload.isRunning}
                        startIcon={!upload.isRunning && <PlayIcon />}
                        sx={{ 
                          minWidth: 200,
                          height: 56,
                          background: `linear-gradient(45deg, ${theme.palette.error.main} 30%, ${theme.palette.error.light} 90%)`,
                        }}
                      >
                        {upload.isRunning
                          ? isZh ? '正在评估...' : 'Evaluating...'
                          : isZh ? '开始群体公平性评估' : 'Run group fairness evaluation'}
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
                        {isZh ? '评估结论（系统判断）' : 'Evaluation conclusion'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {translateOverallAssessment(scenario.overallAssessment)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {scenario.fedE3Analysis.overallFairness ? (
                          <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
                        ) : (
                          <ErrorIcon color="error" sx={{ fontSize: 32 }} />
                        )}
                        <Box>
                          <Typography variant="body2" color="text.secondary">{isZh ? '偏置类型' : 'Bias type'}</Typography>
                          <Typography variant="h6">{biasTypeLabel}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">{isZh ? '风险等级' : 'Risk level'}</Typography>
                          <Chip 
                            label={translateRiskLevel(scenario.fedE3Analysis.riskLevel)}
                            color={scenario.fedE3Analysis.riskLevel === 'Low' ? 'success' : scenario.fedE3Analysis.riskLevel === 'Medium' ? 'warning' : 'error'}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {isZh
                          ? '说明：结论用于快速判断群体公平性与部署风险。'
                          : 'This conclusion is intended for a quick view of group fairness and deployment risk.'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid size={12}>
          <FederatedUploadSection
            title={isZh ? '上传群体公平性摘要' : 'Upload group fairness summaries'}
            description={
              isZh
                ? '每个客户端仅上传本地 txt 文件，系统先提取/统计 bootstrap 公平性差异（均值、标准差、分位数置信区间），再生成统一的群体公平性评估结果。'
                : 'Each client uploads a local txt file. The system extracts bootstrap fairness differences (mean, standard deviation, and percentile intervals) and then produces a unified group fairness assessment.'
            }
            upload={upload}
            summaryRunLabel={
              <>
                {isZh ? '使用汇总统计运行 ' : 'Run '}
                <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} ariaLabel="Fed-e3" />
              </>
            }
            summaryRunningLabel={
              <>
                {isZh ? '正在汇总 ' : 'Running '}
                <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} ariaLabel="Fed-e3" />
                ...
              </>
            }
            debugTitle={isZh ? '高级模式 / 调试' : 'Advanced / Debug'}
            debugRunLabel={isZh ? '直接运行（原始数组）' : 'Run directly (raw arrays)'}
            debugRunningLabel={
              <>
                {isZh ? '运行中...' : 'Running...'}
              </>
            }
          />
        </Grid>

        {/* Fed-e³ Three-Phase Analysis */}
        {evaluationResult && (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  {isZh
                    ? '三层评估流程（检测 → 分类 → 量化）'
                    : 'Three-stage workflow (Detection → Classification → Quantification)'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {isZh
                    ? '说明：系统按“检测—分类—量化”递进输出群体公平性结论。'
                    : 'The system outputs group fairness conclusions in the sequence of detection, classification, and quantification.'}
                </Typography>
                
                {/* Detection Phase */}
                <Accordion 
                  expanded={expandedPanel === 'detection'} 
                  onChange={handleAccordionChange('detection')}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <VisibilityIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{isZh ? '第一层：检测' : 'Stage 1: Detection'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isZh ? '两阶段统计假设检验' : 'Two-stage statistical hypothesis testing'}
                        </Typography>
                      </Box>
                      <Chip 
                        label={evaluationResult ? (isZh ? '已完成' : 'Completed') : (isZh ? '待运行' : 'Pending')}
                        color={evaluationResult ? 'success' : 'default'}
                        size="small"
                        sx={{ mr: 2 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>{isZh ? '两阶段统计检验结果' : 'Two-stage statistical testing result'}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {isZh
                          ? '说明：用于判断不同客户端是否存在显著偏差。'
                          : 'This section checks whether statistically significant deviations exist across clients.'}
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid size={6}>
                          <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.info.main, 0.05) }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                              {isZh ? '阶段 1：一致性检验' : 'Stage 1: Consistency test'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              {translateStageDesc(evaluationResult.fedE3Analysis.twoStageTest.stage1_description)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{isZh ? 'P 值：' : 'P-value:'}</Typography>
                              <Typography variant="h6" color={evaluationResult.fedE3Analysis.twoStageTest.stage1_passed ? 'success.main' : 'error.main'}>
                                {evaluationResult.fedE3Analysis.twoStageTest.stage1_pValue.toFixed(3)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{isZh ? '统计量：' : 'Test statistic:'}</Typography>
                              <Typography variant="body1">{evaluationResult.fedE3Analysis.twoStageTest.stage1_testStatistic.toFixed(3)}</Typography>
                            </Box>
                            <Chip 
                              label={
                                evaluationResult.fedE3Analysis.twoStageTest.stage1_passed
                                  ? isZh ? '通过（p > 0.05）' : 'Passed (p > 0.05)'
                                  : isZh ? '未通过（p < 0.05）' : 'Failed (p < 0.05)'
                              }
                              color={evaluationResult.fedE3Analysis.twoStageTest.stage1_passed ? 'success' : 'error'}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </Paper>
                        </Grid>
                        <Grid size={6}>
                          <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.warning.main, 0.05) }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                              {isZh ? '阶段 2：公平性检验' : 'Stage 2: Fairness test'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              {translateStageDesc(evaluationResult.fedE3Analysis.twoStageTest.stage2_description)}
                            </Typography>
                            {evaluationResult.fedE3Analysis.twoStageTest.stage2_pValue >= 0 ? (
                              <>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{isZh ? 'P 值：' : 'P-value:'}</Typography>
                                  <Typography variant="h6" color={evaluationResult.fedE3Analysis.twoStageTest.stage2_passed ? 'success.main' : 'error.main'}>
                                    {evaluationResult.fedE3Analysis.twoStageTest.stage2_pValue.toFixed(3)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{isZh ? '统计量：' : 'Test statistic:'}</Typography>
                                  <Typography variant="body1">{evaluationResult.fedE3Analysis.twoStageTest.stage2_testStatistic.toFixed(3)}</Typography>
                                </Box>
                                <Chip 
                                  label={
                                    evaluationResult.fedE3Analysis.twoStageTest.stage2_passed
                                      ? isZh ? '通过（p > 0.05）' : 'Passed (p > 0.05)'
                                      : isZh ? '未通过（p < 0.05）' : 'Failed (p < 0.05)'
                                  }
                                  color={evaluationResult.fedE3Analysis.twoStageTest.stage2_passed ? 'success' : 'error'}
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                {isZh ? '不适用（阶段 1 未通过）' : 'Not applicable (stage 1 not passed)'}
                              </Typography>
                            )}
                          </Paper>
                        </Grid>
                      </Grid>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
                
                {/* Classification Phase */}
                <Accordion 
                  expanded={expandedPanel === 'classification'} 
                  onChange={handleAccordionChange('classification')}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <CategoryIcon sx={{ mr: 2, color: theme.palette.secondary.main }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{isZh ? '第二层：分类' : 'Stage 2: Classification'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isZh ? '分类偏置类型（公平 / 系统性 / 异质性）' : 'Bias type classification (fair / systemic / heterogeneous)'}
                        </Typography>
                      </Box>
                      <Chip 
                        label={evaluationResult ? (isZh ? '已完成' : 'Completed') : (isZh ? '待运行' : 'Pending')}
                        color={evaluationResult ? 'success' : 'default'}
                        size="small"
                        sx={{ mr: 2 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>{isZh ? '偏置类型判定结果' : 'Bias type classification result'}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {isZh
                          ? '说明：用于区分系统性偏置与异质性偏置，便于后续量化。'
                          : 'This section distinguishes systemic bias from heterogeneous bias for subsequent quantification.'}
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid size={6}>
                          <Box sx={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={biasTypeDistribution}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={(entry) => entry.name}
                                >
                                  {biasTypeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            {isZh
                              ? '说明：饼图展示系统判定的偏置类型占比（示例为单一类型）。'
                              : 'The pie chart shows the predicted bias category distribution (single-category example shown here).'}
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Box sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{isZh ? '分类结论' : 'Classification result'}</Typography>
                            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                              {biasTypeLabel}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{isZh ? '分类依据' : 'Rationale'}</Typography>
                            <Typography variant="body2" sx={{ mb: 3, p: 2, backgroundColor: alpha(theme.palette.info.main, 0.05), borderRadius: 1 }}>
                              {translateClassificationReason(evaluationResult.fedE3Analysis.biasClassification.classificationReason)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{isZh ? '置信度' : 'Confidence'}</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={evaluationResult.fedE3Analysis.biasClassification.confidenceLevel * 100}
                              sx={{ mt: 1, mb: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {(evaluationResult.fedE3Analysis.biasClassification.confidenceLevel * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
                
                {/* Quantification Phase */}
                <Accordion 
                  expanded={expandedPanel === 'quantification'} 
                  onChange={handleAccordionChange('quantification')}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <AnalyticsIcon sx={{ mr: 2, color: theme.palette.warning.main }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{isZh ? '第三层：量化' : 'Stage 3: Quantification'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isZh ? '量化偏置强度并给出置信区间' : 'Quantify bias magnitude and confidence intervals'}
                        </Typography>
                      </Box>
                      <Chip 
                        label={evaluationResult ? (isZh ? '已完成' : 'Completed') : (isZh ? '待运行' : 'Pending')}
                        color={evaluationResult ? 'success' : 'default'}
                        size="small"
                        sx={{ mr: 2 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>{isZh ? '偏置强度量化结果' : 'Bias quantification result'}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {isZh
                          ? '说明：用于量化偏置的强弱程度与可信范围。'
                          : 'This section quantifies the strength of bias and its confidence range.'}
                      </Typography>
                      {evaluationResult.fedE3Analysis.biasClassification.biasType === 'fair' ? (
                        <Box sx={{ textAlign: 'center', p: 4, backgroundColor: alpha(theme.palette.success.main, 0.05), borderRadius: 1 }}>
                          <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
                          <Typography variant="h6" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>{isZh ? '判定为公平' : 'Classified as fair'}</Typography>
                          <Typography variant="body1" color="success.main">
                            {isZh
                              ? '说明：当前模型在不同群体间未发现显著偏置，可无需进一步量化。'
                              : 'No significant bias is detected across groups, so further quantification is unnecessary.'}
                          </Typography>
                        </Box>
                      ) : (
                        <Grid container spacing={3}>
                          {evaluationResult.fedE3Analysis.dpQuantification && (
                            <Grid size={6}>
                              <Paper sx={{ p: 3, backgroundColor: alpha(theme.palette.error.main, 0.02), border: `1px solid ${alpha(theme.palette.error.main, 0.2)}` }}>
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>{isZh ? '人口统计均衡（DP）' : 'Demographic parity (DP)'}</Typography>
                                <Typography variant="h4" color="error.main" sx={{ mb: 2, fontWeight: 700 }}>
                                  {evaluationResult.fedE3Analysis.dpQuantification.pointEstimate.toFixed(3)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>{isZh ? '95% 置信区间' : '95% confidence interval'}</Typography>
                                <Typography variant="h6" sx={{ mb: 2, p: 1, backgroundColor: 'white', borderRadius: 1, textAlign: 'center' }}>
                                  [{evaluationResult.fedE3Analysis.dpQuantification.confidenceInterval.lower.toFixed(3)}, {evaluationResult.fedE3Analysis.dpQuantification.confidenceInterval.upper.toFixed(3)}]
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                                  {translateInterpretation(evaluationResult.fedE3Analysis.dpQuantification.interpretation)}
                                </Typography>
                              </Paper>
                            </Grid>
                          )}
                          {evaluationResult.fedE3Analysis.eoQuantification && (
                            <Grid size={6}>
                              <Paper sx={{ p: 3, backgroundColor: alpha(theme.palette.warning.main, 0.02), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>{isZh ? '机会均等（EO）' : 'Equal opportunity (EO)'}</Typography>
                                <Typography variant="h4" color="warning.main" sx={{ mb: 2, fontWeight: 700 }}>
                                  {evaluationResult.fedE3Analysis.eoQuantification.pointEstimate.toFixed(3)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>{isZh ? '95% 置信区间' : '95% confidence interval'}</Typography>
                                <Typography variant="h6" sx={{ mb: 2, p: 1, backgroundColor: 'white', borderRadius: 1, textAlign: 'center' }}>
                                  [{evaluationResult.fedE3Analysis.eoQuantification.confidenceInterval.lower.toFixed(3)}, {evaluationResult.fedE3Analysis.eoQuantification.confidenceInterval.upper.toFixed(3)}]
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                                  {translateInterpretation(evaluationResult.fedE3Analysis.eoQuantification.interpretation)}
                                </Typography>
                              </Paper>
                            </Grid>
                          )}
                        </Grid>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                        {isZh
                          ? '说明：数值与置信区间用于量化偏置强度与不确定性。'
                          : 'Values and confidence intervals quantify bias magnitude and uncertainty.'}
                      </Typography>
                      <Box sx={{ mt: 4, p: 3, backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                        <Typography variant="h6" color="primary.main" sx={{ mb: 2, fontWeight: 600 }}>{isZh ? '部署建议' : 'Deployment recommendation'}</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                          {translateRecommendation(evaluationResult.fedE3Analysis.deploymentRecommendation)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          {isZh
                            ? '说明：结合偏置类型与量化结果给出面向部署的建议。'
                            : 'Recommendations are provided by combining bias type and quantified results.'}
                        </Typography>
                      </Box>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Grid>
        )}

      </Grid>
    </Container>
  );
};

export default ModelFairness;
