import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Home as HomeIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  ModelTraining as ModelIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { InlineMath } from './MathText';
import { useLanguage } from '../i18n/language';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const { isZh } = useLanguage();
  const menuItems = [
    { text: isZh ? '首页' : 'Home', path: '/', icon: <HomeIcon /> },
    { text: <InlineMath math={'\\mathrm{Fed\\text{-}e^3}'} ariaLabel="Fed-e3" />, path: '/model-fairness', icon: <ModelIcon /> },
    { text: <InlineMath math={'\\mathrm{Fed4Fed}'} ariaLabel="Fed4Fed" />, path: '/performance-fairness', icon: <SpeedIcon /> },
    { text: <InlineMath math={'D^3EM'} ariaLabel="D3EM" />, path: '/collaborative-fairness', icon: <AssessmentIcon /> },
  ];

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {isZh ? '联邦评估' : 'Federated Evaluation'}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />
      
      <List sx={{ flex: 1, px: 1 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          
          return (
            <motion.div
              key={item.path}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={onClose}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 'bold' : 'normal',
                  }}
                />
              </ListItemButton>
            </motion.div>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;
