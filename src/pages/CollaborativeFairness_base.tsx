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
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import scenarios, { Scenario } from '../data/collaborative-fairness';

const CollaborativeFairness: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('balanced');
  const [evaluationResult, setEvaluationResult] = useState<Scenario | null>(null);

  const handleScenarioChange = (event: any) => {
    setEvaluationResult(null);
    setSelectedScenario(event.target.value as string);
  };

  const handleRunEvaluation = () => {
    setEvaluationResult(scenarios[selectedScenario]);
  };

  const chartData = useMemo(() => {
    if (!evaluationResult) return [];
    return evaluationResult.clients.map(client => ({
      name: client.id,
      'Traditional Score': client.traditionalScore,
      'Proposed Score': client.proposedScore,
      'True Contribution': client.trueContribution,
    }));
  }, [evaluationResult]);

  return (
    <Container maxWidth="xl">
      <Grid container spacing={3}>
        {/* Introduction Section */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                Collaborative Fairness Evaluation
              </Typography>
              <Typography variant="body1" color="text.secondary">
                This section evaluates the fairness of collaboration among clients in Federated Learning. The core principle is 'more contribution, more reward'. Traditional methods often use simple metrics like data size to approximate contribution, which can be inaccurate. Our proposed method provides a more precise evaluation of each client's contribution by analyzing their impact on the global model, effectively filtering out noise and leading to a more equitable distribution of incentives.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Controls Section */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Interactive Simulation
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControl sx={{ minWidth: 300 }}>
                  <InputLabel id="scenario-select-label">Select a Scenario</InputLabel>
                  <Select
                    labelId="scenario-select-label"
                    value={selectedScenario}
                    label="Select a Scenario"
                    onChange={handleScenarioChange}
                  >
                    {Object.keys(scenarios).map(key => (
                      <MenuItem key={key} value={key}>{scenarios[key].name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={handleRunEvaluation}>
                  Run Evaluation
                </Button>
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                {scenarios[selectedScenario].description}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section */}
        {evaluationResult && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Evaluation Results: {evaluationResult.name}
                </Typography>
                <Grid container spacing={3}>
                  {/* Chart */}
                  <Grid size={{ xs: 12, lg: 7 }}>
                    <Typography variant="h6">Contribution Score Comparison</Typography>
                    <Box sx={{ height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Traditional Score" fill="#8884d8" />
                          <Bar dataKey="Proposed Score" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>

                  {/* Table */}
                  <Grid size={{ xs: 12, lg: 5 }}>
                    <Typography variant="h6">Detailed Incentive Allocation</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Client ID</TableCell>
                            <TableCell align="right">Data Size</TableCell>
                            <TableCell align="right">Proposed Score</TableCell>
                            <TableCell align="right">Incentive (%)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {evaluationResult.clients.map((client) => (
                            <TableRow key={client.id}>
                              <TableCell component="th" scope="row">
                                {client.id}
                              </TableCell>
                              <TableCell align="right">{client.dataSize}</TableCell>
                              <TableCell align="right">{client.proposedScore.toFixed(2)}</TableCell>
                              <TableCell align="right"><b>{(client.proposedScore * 100).toFixed(1)}%</b></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default CollaborativeFairness;