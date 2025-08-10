import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

function WordDetailsDialog({ open, onClose, word }) {
  if (!word) {
    return null; // Don't render if no word is provided
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{word.word}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" component="h3" gutterBottom>
          Explanation:
        </Typography>
        <Typography variant="body1" paragraph>
          {word.initial_ai_explanation}
        </Typography>
        {/* Add more details here later, e.g., next review date, interval, etc. */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default WordDetailsDialog;
