import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';

export type FlowStepItem = {
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  labelIcon?: React.ReactNode;
};

interface FlowStepsProps {
  steps: FlowStepItem[];
  variant?: 'numbered' | 'check';
  activeStep?: number;
  maxLabelWidth?: { xs?: number; sm?: number; md?: number };
}

const FlowSteps: React.FC<FlowStepsProps> = ({
  steps,
  variant = 'numbered',
  activeStep = 0,
  maxLabelWidth = { xs: 72, sm: 92, md: 108 },
}) => {
  const theme = useTheme();
  const lineColor = alpha(theme.palette.text.secondary, 0.35);
  const activeColor = theme.palette.success.main;
  const inactiveColor = alpha(theme.palette.text.secondary, 0.5);
  const circleSize = 26;

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', overflowX: 'hidden' }}>
      {steps.map((step, index) => {
        const isDone = variant === 'check' || index <= activeStep;

        return (
          <Box
            key={`${index}-${typeof step.label === 'string' ? step.label : 'step'}`}
            sx={{
              flex: 1,
              minWidth: 0,
              px: { xs: 0.25, sm: 0.5, md: 0.75 },
              position: 'relative',
              textAlign: 'center',
            }}
          >
            {index > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: `${circleSize / 2}px`,
                  left: 'calc(-50% + 13px)',
                  width: 'calc(100% - 26px)',
                  height: '2px',
                  bgcolor: lineColor,
                  transform: 'translateY(-50%)',
                  borderRadius: '999px',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              />
            )}

            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                width: circleSize,
                height: circleSize,
                borderRadius: '50%',
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isDone ? activeColor : inactiveColor,
                color: theme.palette.common.white,
                fontWeight: 700,
                fontSize: '0.78rem',
              }}
            >
              {variant === 'check' ? <CheckIcon sx={{ fontSize: 16 }} /> : index + 1}
            </Box>

            <Box
              sx={{
                mt: 1.25,
                mx: 'auto',
                maxWidth: maxLabelWidth,
                minHeight: { xs: 46, sm: 52, md: 56 },
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  flexWrap: 'wrap',
                  width: '100%',
                }}
              >
                {step.labelIcon}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.15,
                    fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.86rem' },
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    textAlign: 'center',
                  }}
                >
                  {step.label}
                </Typography>
              </Box>
              {step.sublabel ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.25,
                    lineHeight: 1.1,
                    fontSize: { xs: '0.64rem', sm: '0.7rem', md: '0.74rem' },
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {step.sublabel}
                </Typography>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default FlowSteps;
