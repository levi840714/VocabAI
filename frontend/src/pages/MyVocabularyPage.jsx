import React, { useState } from 'react';
import VocabularyList from '../components/VocabularyList';
import AddWordDialog from '../components/AddWordDialog';
import { Container, TextField, Button, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

function MyVocabularyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  const handleAddWord = (newWord) => {
    console.log('New word to add:', newWord); // Placeholder for API call
    handleCloseAddDialog();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Search words..."
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddDialog}>
          Add Word
        </Button>
      </Box>
      <VocabularyList searchTerm={searchTerm} />
      <AddWordDialog
        open={openAddDialog}
        onClose={handleCloseAddDialog}
        onAddWord={handleAddWord}
      />
    </Container>
  );
}

export default MyVocabularyPage;
