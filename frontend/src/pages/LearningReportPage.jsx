import React from 'react';
import { Container, Typography } from '@mui/material';

function LearningReportPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Learning Report
      </Typography>
      <Typography variant="body1">
        This is where the learning report and statistics will be displayed.
      </Typography>
    </Container>
  );
}

export default LearningReportPage;
