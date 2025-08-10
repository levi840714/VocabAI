import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

function AddWordDialog({ open, onClose, onAddWord }) {
  const [word, setWord] = useState('');
  const [explanation, setExplanation] = useState('');

  const handleAdd = () => {
    if (word.trim() && explanation.trim()) {
      onAddWord({ word, explanation });
      setWord('');
      setExplanation('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add New Word</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Word"
          type="text"
          fullWidth
          variant="standard"
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Explanation"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="standard"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddWordDialog;
