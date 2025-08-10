import React, { useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import WordDetailsDialog from './WordDetailsDialog';

const placeholderWords = [
  { id: 1, word: 'Ephemeral', initial_ai_explanation: 'Lasting for a very short time.' },
  { id: 2, word: 'Serendipity', initial_ai_explanation: 'The occurrence and development of events by chance in a happy or beneficial way.' },
  { id: 3, word: 'Ubiquitous', initial_ai_explanation: 'Present, appearing, or found everywhere.' },
  { id: 4, word: 'Mellifluous', initial_ai_explanation: '(Of a voice or words) sweet or musical; pleasant to hear.' },
  { id: 5, word: 'Luminous', initial_ai_explanation: 'Emitting or reflecting light; shining.' },
];

function VocabularyList({ searchTerm }) {
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);

  const filteredWords = placeholderWords.filter(word =>
    word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    word.initial_ai_explanation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDetailsDialog = (word) => {
    setSelectedWord(word);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedWord(null);
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        My Vocabulary
      </Typography>
      {filteredWords.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          No words found matching your search.
        </Typography>
      ) : (
        <List>
          {filteredWords.map((word) => (
            <ListItem key={word.id} divider onClick={() => handleOpenDetailsDialog(word)}>
              <ListItemText
                primary={<Typography variant="h6">{word.word}</Typography>}
                secondary={<Typography variant="body2" color="text.secondary">{word.initial_ai_explanation}</Typography>}
              />
            </ListItem>
          ))}
        </List>
      )}
      <WordDetailsDialog
        open={openDetailsDialog}
        onClose={handleCloseDetailsDialog}
        word={selectedWord}
      />
    </Paper>
  );
}

export default VocabularyList;
