import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  TextField,
  Alert,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  DeleteOutline as DeleteOutlineIcon,
  UploadFile as UploadFileIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { UseFederatedUploadResult } from './useFederatedUpload';
import { useLanguage } from '../../i18n/language';
import FlowSteps from '../FlowSteps';

interface FederatedUploadSectionProps {
  title: React.ReactNode;
  description: React.ReactNode;
  upload: UseFederatedUploadResult;
  alphaLabel?: string;
  summaryRunLabel?: React.ReactNode;
  summaryRunningLabel?: React.ReactNode;
  debugTitle?: React.ReactNode;
  debugWarning?: React.ReactNode;
  debugRunLabel?: React.ReactNode;
  debugRunningLabel?: React.ReactNode;
}

const FederatedUploadSection: React.FC<FederatedUploadSectionProps> = ({
  title,
  description,
  upload,
  alphaLabel: alphaLabelProp,
  summaryRunLabel: summaryRunLabelProp,
  summaryRunningLabel: summaryRunningLabelProp,
  debugTitle: debugTitleProp,
  debugWarning: debugWarningProp,
  debugRunLabel: debugRunLabelProp,
  debugRunningLabel: debugRunningLabelProp,
}) => {
  const { isZh } = useLanguage();
  const alphaLabel = alphaLabelProp ?? (isZh ? 'alpha（分位数置信区间）' : 'alpha (percentile CI)');
  const summaryRunLabel = summaryRunLabelProp ?? (isZh ? '运行评估' : 'Run evaluation');
  const summaryRunningLabel = summaryRunningLabelProp ?? (isZh ? '正在汇总...' : 'Aggregating...');
  const debugTitle = debugTitleProp ?? (isZh ? '高级模式 / 调试' : 'Advanced / Debug');
  const debugWarning =
    debugWarningProp ??
    (isZh
      ? '直接粘贴/上传原始 bootstrap 数组可用于快速验证；默认流程请使用上方“本地文件 → 本地汇总 → 汇总计算”。'
      : 'You can paste or upload raw bootstrap arrays for quick validation. The default workflow is file upload, local summary, then aggregated evaluation.');
  const debugRunLabel = debugRunLabelProp ?? (isZh ? '直接运行（原始数组）' : 'Run (raw arrays)');
  const debugRunningLabel = debugRunningLabelProp ?? (isZh ? '运行中...' : 'Running...');
  const privacySteps = [
    { label: isZh ? '读取文件' : 'Read file' },
    { label: isZh ? '本地汇总' : 'Local summary' },
    { label: isZh ? '隐私锁' : 'Privacy lock', labelIcon: <LockIcon sx={{ fontSize: 15 }} /> },
    { label: isZh ? '使用汇总' : 'Use summary' },
    { label: isZh ? '计算' : 'Compute' },
    { label: isZh ? '结果' : 'Results' },
  ];

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        <Box sx={{ maxWidth: 900, mx: 'auto', mb: 3 }}>
          <FlowSteps steps={privacySteps} activeStep={upload.activeStep} maxLabelWidth={{ xs: 70, sm: 92, md: 112 }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Button startIcon={<AddCircleOutlineIcon />} variant="outlined" onClick={upload.handleAddClient}>
            {isZh ? '添加客户端' : 'Add client'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            {upload.uploadHelpText}
          </Typography>
          <TextField
            label={alphaLabel}
            type="number"
            size="small"
            value={upload.alphaLevel}
            inputProps={{ step: 0.01, min: 0.001, max: 0.5 }}
            onChange={(e) => upload.handleAlphaChange(e.target.value)}
            sx={{ width: 180, ml: 'auto' }}
          />
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {upload.clientInputs.map((client) => (
            <Grid size={{ xs: 12, md: 6 }} key={client.id}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {client.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {client.fileName || (isZh ? '等待上传文本 (.txt / .csv)' : 'Waiting for upload (.txt / .csv)')}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label="remove client"
                    size="small"
                    color="error"
                    onClick={() => upload.handleRemoveClient(client.id)}
                    disabled={upload.clientInputs.length <= 1}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    color="primary"
                  >
                    {isZh ? '上传 txt' : 'Upload txt'}
                    <input
                      type="file"
                      accept=".txt,.csv"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        upload.handleFileChange(client.id, file);
                        e.target.value = '';
                      }}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {client.summary
                      ? isZh
                        ? '已完成本地统计（不上传原始数组）'
                        : 'Local summary ready (raw arrays stay local)'
                      : isZh
                        ? '请上传含 bootstrap 序列的文件'
                        : 'Upload a file containing bootstrap values'}
                  </Typography>
                </Box>
                {client.summary && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`n = ${client.summary.n}`} size="small" />
                    <Chip label={`mean = ${client.summary.mean.toFixed(3)}`} size="small" color="info" />
                    <Chip label={`std = ${client.summary.std.toFixed(3)}`} size="small" color="default" />
                    <Chip
                      label={`CI = [${client.summary.ci[0].toFixed(3)}, ${client.summary.ci[1].toFixed(3)}]`}
                      size="small"
                      color="success"
                    />
                  </Box>
                )}
                {client.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {client.error}
                  </Alert>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          {isZh ? '本地汇总（仅上传下方统计量）' : 'Local summary (aggregated statistics only)'}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell><strong>{isZh ? '文件' : 'File'}</strong></TableCell>
                <TableCell><strong>n</strong></TableCell>
                <TableCell><strong>mean</strong></TableCell>
                <TableCell><strong>std</strong></TableCell>
                <TableCell><strong>{isZh ? '分位数区间' : 'Percentile CI'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {upload.localSummaryRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.fileName}</TableCell>
                  <TableCell>{row.summary ? row.summary.n : '—'}</TableCell>
                  <TableCell>
                    {row.summary ? row.summary.mean.toFixed(3) : '—'}
                  </TableCell>
                  <TableCell>{row.summary ? row.summary.std.toFixed(3) : '—'}</TableCell>
                  <TableCell>
                    {row.summary
                      ? `[${row.summary.ci[0].toFixed(3)}, ${row.summary.ci[1].toFixed(3)}]`
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {upload.summaryError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {upload.summaryError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          {!upload.clientsReady && (
            <Typography variant="body2" color="text.secondary">
              {isZh
                ? '上传完成且每个客户端至少 2 个样本后才可运行'
                : 'Run becomes available after every client has at least 2 samples.'}
            </Typography>
          )}
          {upload.isRunning && <LinearProgress sx={{ width: 180 }} />}
          <Button
            variant="contained"
            startIcon={!upload.isRunning && <PlayIcon />}
            onClick={upload.runSummary}
            disabled={!upload.clientsReady || upload.isRunning}
            sx={{
              background: (theme) => `linear-gradient(45deg, ${theme.palette.error.main} 30%, ${theme.palette.error.light} 90%)`,
            }}
          >
            {upload.isRunning ? summaryRunningLabel : summaryRunLabel}
          </Button>
        </Box>

        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {debugTitle}
              </Typography>
              <Chip label={isZh ? '原始数组' : 'Raw arrays'} size="small" color="warning" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {debugWarning}
            </Alert>
            <TextField
              multiline
              minRows={4}
              fullWidth
              value={upload.debugInput}
              onChange={(e) => upload.setDebugInput(e.target.value)}
            />
            {upload.debugError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {upload.debugError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              {upload.isRunning && <LinearProgress sx={{ width: 180 }} />}
              <Button
                variant="outlined"
                startIcon={!upload.isRunning && <PlayIcon />}
                onClick={upload.runDebug}
                disabled={upload.isRunning}
              >
                {upload.isRunning ? debugRunningLabel : debugRunLabel}
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FederatedUploadSection;
