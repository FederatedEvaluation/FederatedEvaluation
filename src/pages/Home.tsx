import React from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Paper,
  Chip,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  People as PeopleIcon,
  BarChart as BarChartIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as AwardIcon,
  Psychology as BrainIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { InlineMath } from '../components/MathText';
import { useLanguage } from '../i18n/language';

const Home: React.FC = () => {
  const theme = useTheme();
  const { isZh } = useLanguage();

  const fairnessDimensions = [
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} variant="title" />,
      subtitle: isZh ? '群体公平性级联评估框架' : 'Group Fairness Cascade Framework',
      description: (
        <>
          {isZh ? (
            <>
              <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} ariaLabel="Fed-e3" />
              通过“检测-分类-量化”三级机制，对联邦环境中的群体偏置进行识别、归因与量化。
            </>
          ) : (
            <>
              Introduces <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} ariaLabel="Fed-e3" />, the first federated
              framework implementing the "Detection-Classification-Quantification" cascade for comprehensive group bias
              evaluation, attribution, and quantification.
            </>
          )}
        </>
      ),
      features: isZh
        ? ['偏置检测', '偏置分类与归因', '偏置量化']
        : ['Bias detection', 'Bias classification & attribution', 'Precise bias quantification'],
      color: theme.palette.error.main,
      path: '/model-fairness',
      gradient: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.light} 100%)`,
    },
    {
      icon: <BarChartIcon sx={{ fontSize: 40 }} />,
      title: <InlineMath math={'\\mathrm{Fed4Fed}'} variant="title" />,
      subtitle: isZh ? '跨客户端性能评估框架' : 'Cross-client Performance Assessment Framework',
      description: isZh
        ? 'Fed4Fed 基于统计推断，将多客户端信息融合与假设检验结合起来，用于评估联邦参与方之间的性能一致性。'
        : 'Proposes Fed4Fed framework based on statistical inference, combining multi-client data fusion with hypothesis testing to achieve reliable performance consistency evaluation across federated participants.',
      features: isZh
        ? ['多客户端融合', '统计假设检验', '性能一致性评估']
        : ['Multi-client fusion', 'Statistical hypothesis testing', 'Performance consistency assessment'],
      color: theme.palette.secondary.main,
      path: '/performance-fairness',
      gradient: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`,
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      title: <InlineMath math={'D^3\\mathrm{EM}'} variant="title" />,
      subtitle: isZh ? '双层动态去偏贡献评估机制' : 'Dual-layer Dynamic Debiasing Contribution Evaluation Mechanism',
      description: isZh
        ? 'D³EM 面向贡献评估中的“联邦噪声耦合效应”，通过解耦独立价值与协作价值，实现更稳健的客户端贡献评估。'
        : 'Introduces D³EM to address "Federated Noise Coupling Effect" in contribution assessment, achieving precise and robust client contribution evaluation through decoupling independent and collaborative values.',
      features: isZh
        ? ['噪声消除', '灵活激励整合', '增强协作公平']
        : ['Noise elimination', 'Flexible incentive integration', 'Enhanced collaboration equity'],
      color: theme.palette.primary.main,
      path: '/collaborative-fairness',
      gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    },
  ];

  const keyAchievements = [
    {
      icon: <TrendingUpIcon />,
      label: isZh ? '联邦评估理论' : 'Federated Evaluation Theory',
      value: isZh ? '数据留在本地，评估在全局流动' : 'Data Stays, Evaluation Moves',
    },
    {
      icon: <AwardIcon />,
      label: isZh ? '三维评估框架' : 'Three-Dimensional Framework',
      valueNode: <InlineMath math={'\\mathrm{Fed\\text{-}e^3} + \\mathrm{Fed4Fed} + D^3\\mathrm{EM}'} ariaLabel="Fed-e3 plus Fed4Fed plus D3EM" />,
    },
    {
      icon: <BrainIcon />,
      label: isZh ? '隐私保留评估' : 'Privacy-Preserving Assessment',
      value: isZh ? '全局视角重建' : 'Global View Reconstruction',
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Paper
          sx={{
            p: { xs: 3, md: 6 },
            mb: 6,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3Ccircle cx="37" cy="37" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h1" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
              {isZh ? '联邦评估框架' : 'Federated Evaluation Framework'}
            </Typography>
            <Typography variant="h5" component="p" sx={{ mb: 4, opacity: 0.9, maxWidth: '800px', mx: 'auto' }}>
              {isZh
                ? '一个面向联邦评估流程的交互式系统，集成群体公平性、性能公平性与协作公平性分析，并支持样例输入与可视化结果展示。'
                : 'An interactive system for federated evaluation workflows, integrating group fairness, performance fairness, and collaborative fairness analysis with sample inputs and visualized results.'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              {keyAchievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                    <Chip
                      icon={achievement.icon}
                      label={
                        achievement.valueNode ? (
                          <span>
                            {achievement.label}: {achievement.valueNode}
                          </span>
                        ) : `${achievement.label}: ${achievement.value}`
                      }
                      sx={{
                        backgroundColor: alpha(theme.palette.common.white, 0.2),
                        color: 'white',
                        fontWeight: 600,
                        '& .MuiChip-icon': { color: 'white' },
                      }}
                    />
                </motion.div>
              ))}
            </Box>
          </Box>
        </Paper>
      </motion.div>

      {/* Fairness Dimensions */}
      <Grid container spacing={4}>
        {fairnessDimensions.map((dimension, index) => (
          <Grid key={index} size={{ xs: 12, lg: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
              whileHover={{ y: -8 }}
              style={{ height: '100%' }}
            >
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  border: `2px solid ${alpha(dimension.color, 0.1)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: dimension.gradient,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        backgroundColor: alpha(dimension.color, 0.1),
                        color: dimension.color,
                        mr: 2,
                        width: 60,
                        height: 60,
                      }}
                    >
                      {dimension.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {dimension.title}
                      </Typography>
                      <Typography variant="subtitle1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {dimension.subtitle}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {dimension.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: dimension.color }}>
                      {isZh ? '核心特性：' : 'Key Features:'}
                    </Typography>
                    {dimension.features.map((feature, featureIndex) => (
                      <Chip
                        key={featureIndex}
                        label={feature}
                        size="small"
                        sx={{
                          m: 0.25,
                          backgroundColor: alpha(dimension.color, 0.1),
                          color: dimension.color,
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
                
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button 
                    component={Link}
                    to={dimension.path}
                    variant="contained"
                    fullWidth
                    sx={{ 
                      background: dimension.gradient,
                      fontWeight: 600,
                      py: 1.5,
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: `0 8px 25px ${alpha(dimension.color, 0.3)}`,
                      },
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{isZh ? '进入' : 'Explore'}</span>
                      {dimension.title}
                      <span>→</span>
                    </span>
                  </Button>
                </CardActions>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Research Context */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Paper sx={{ p: 4, mt: 6, backgroundColor: theme.palette.background.default }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', fontWeight: 600, mb: 3 }}>
            {isZh ? '联邦评估理论框架' : 'Federated Evaluation Theory Innovation'}
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '900px', mx: 'auto', lineHeight: 1.8 }}>
            {isZh
              ? '本系统展示了“联邦评估”框架的核心思想。该框架提出“数据留在本地，评估在全局流动”的范式，在不直接访问私有数据的前提下，实现多客户端信息的安全高效融合，并重建联邦系统多维公平状态的全局视图。系统围绕群体公平性、性能公平性和协作公平性三个维度展开，为联邦学习中的公平性诊断、理解与治理提供技术支持。'
              : 'This system presents the core ideas of the "Federated Evaluation" framework. The framework proposes the "Data Stays, Evaluation Moves" paradigm, enabling secure and efficient fusion of multi-client information without direct access to private data, reliably reconstructing global views of federated system multi-dimensional fairness states. The system encompasses three core dimensions: group fairness, performance fairness, and collaborative fairness, providing critical technical support for diagnosing, understanding, and governing fairness issues in federated learning.'}
          </Typography>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default Home;
