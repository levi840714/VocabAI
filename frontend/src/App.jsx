import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import BookIcon from '@mui/icons-material/Book';
import QuizIcon from '@mui/icons-material/Quiz';
import BarChartIcon from '@mui/icons-material/BarChart';

import MyVocabularyPage from './pages/MyVocabularyPage';
import ReviewPage from './pages/ReviewPage';
import LearningReportPage from './pages/LearningReportPage';

function App() {
  const [value, setValue] = useState(0);

  const renderPage = () => {
    switch (value) {
      case 0:
        return <MyVocabularyPage />;
      case 1:
        return <ReviewPage />;
      case 2:
        return <LearningReportPage />;
      default:
        return <MyVocabularyPage />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MemWhiz Mini App
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1 }}>
        {renderPage()}
      </Box>

      <BottomNavigation
        showLabels
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }}
        sx={{ width: '100%', position: 'fixed', bottom: 0 }}
      >
        <BottomNavigationAction label="Vocabulary" icon={<BookIcon />} />
        <BottomNavigationAction label="Review" icon={<QuizIcon />} />
        <BottomNavigationAction label="Report" icon={<BarChartIcon />} />
      </BottomNavigation>
    </Box>
  );
}

export default App
