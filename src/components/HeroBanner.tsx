import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';

interface HeroBannerProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  textColor?: string;
}

const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  subtitle,
  description,
  icon,
  gradientFrom,
  gradientTo,
  textColor = 'white',
}) => {
  return (
    <Card
      sx={{
        mb: 4,
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        color: textColor,
        boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          {icon && (
            <Avatar
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                width: 56,
                height: 56,
              }}
            >
              {icon}
            </Avatar>
          )}
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {description && (
          <Typography variant="body1" sx={{ opacity: 0.95, maxWidth: '900px', lineHeight: 1.7 }}>
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default HeroBanner;
