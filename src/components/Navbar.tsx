import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { Menu as MenuIcon, School, GitHub } from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { InlineMath } from './MathText';
import { useLanguage } from '../i18n/language';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const location = useLocation();
  const { language, isZh, setLanguage } = useLanguage();

  const navItems = [
    { label: isZh ? '首页' : 'Home', path: '/' },
    { label: <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} />, path: '/model-fairness', aria: 'Fed-e3' },
    { label: <InlineMath math={'\\mathrm{Fed4Fed}'} />, path: '/performance-fairness', aria: 'Fed4Fed' },
    { label: <InlineMath math={'\\mathrm{D^3EM}'} />, path: '/collaborative-fairness', aria: 'D3EM' },
  ];

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', flex: 1 }}
        >
          <School sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {isZh ? '联邦评估框架' : 'Federated Evaluation Framework'}
          </Typography>
        </motion.div>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              aria-label={item.aria || (typeof item.label === 'string' ? item.label : undefined)}
              sx={{
                color: 'white',
                fontWeight: 500,
                position: 'relative',
                '&::after': location.pathname === item.path ? {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%',
                  height: 2,
                  backgroundColor: 'white',
                  borderRadius: 1,
                } : {},
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <ButtonGroup
          size="small"
          variant="outlined"
          sx={{
            mr: 1.5,
            '& .MuiButton-root': {
              color: 'white',
              borderColor: alpha(theme.palette.common.white, 0.35),
              minWidth: 52,
            },
          }}
        >
          <Button
            onClick={() => setLanguage('en')}
            sx={{
              backgroundColor: language === 'en' ? alpha(theme.palette.common.white, 0.2) : 'transparent',
            }}
          >
            EN
          </Button>
          <Button
            onClick={() => setLanguage('zh')}
            sx={{
              backgroundColor: language === 'zh' ? alpha(theme.palette.common.white, 0.2) : 'transparent',
            }}
          >
            中文
          </Button>
        </ButtonGroup>

        <IconButton
          color="inherit"
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ 
            '&:hover': {
              transform: 'scale(1.1)',
              transition: 'transform 0.2s ease-in-out',
            },
          }}
        >
          <GitHub />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
