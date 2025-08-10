import React from 'react';
import { Container, Typography } from '@mui/material';

function ReviewPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Review Words
      </Typography>
      <Typography variant="body1">
        This is where the word review functionality will be implemented.
      </Typography>
    </Container>
  );
}

export default ReviewPage;
