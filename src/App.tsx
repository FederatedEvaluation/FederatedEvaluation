import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { motion } from 'framer-motion';
import theme from './theme/theme';
import { LanguageProvider, useLanguage } from './i18n/language';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import ModelFairness from './pages/ModelFairness';
import PerformanceFairness from './pages/PerformanceFairness';
import CollaborativeFairness from './pages/CollaborativeFairness';

const AppShell: React.FC = () => {
  const { language } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar onMenuClick={toggleSidebar} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <motion.div
        key={language}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          flex: 1,
          marginLeft: sidebarOpen ? 240 : 0,
          transition: 'margin-left 0.3s ease-in-out',
          paddingTop: 64,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/model-fairness" element={<ModelFairness />} />
          <Route path="/performance-fairness" element={<PerformanceFairness />} />
          <Route path="/collaborative-fairness" element={<CollaborativeFairness />} />
        </Routes>
      </motion.div>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppShell />
        </Router>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
